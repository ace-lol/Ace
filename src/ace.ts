"use strict";

import { simple_promise_fetch, wrap_method } from "./util";
import BuiltinPlugin, { PluginInfo } from "./builtin-plugin";
import Plugin, { PluginState } from "./plugin";
import HookManager from "./hook-manager";
import registerPlugins from "./plugins";

import toposort = require("toposort");
import Promise = require("bluebird");
import semver = require("semver");

import * as HTTP_HOOK from "./hook-providers/http";
import * as REGISTER_ELEMENT_HOOK from "./hook-providers/register-element";
import * as TEMPLATE_CONTENT_HOOK from "./hook-providers/template-content";
import * as EMBER_COMPONENT_HOOK from "./hook-providers/ember-component";

// Mainly notification styles.
import "./style";

export type LifecycleCallback = (plugin: BuiltinPlugin) => void;

export default class Ace {
    pendingOnloads: any[];
    builtinPlugins: BuiltinPlugin[];
    hookManager: HookManager;

    plugins: Plugin[];
    initializationOrder: string[];
    disabledPlugins: string[];

    // If we encountered something that definitely _shouldn't_ happen, this is
    // set to true. If we are dormant, we will not inject into anything, to
    // prevent any further errors.
    dormant: boolean;

    preinitHooks: { [name: string]: LifecycleCallback[] };
    postinitHooks: { [name: string]: LifecycleCallback[] };

    // These notifications are mainly for errors during startup.
    // Since we cannot be sure that _any_ plugin is loaded, including uikit's ToastManager,
    // we have to create a completely different notification system.
    notificationElement: HTMLDivElement;

    constructor() {
        this.pendingOnloads = [];
        this.builtinPlugins = [];
        this.preinitHooks = {};
        this.postinitHooks = {};
        this.dormant = false;

        this.notificationElement = document.createElement("div");
        this.notificationElement.className = "ace-notifications";
        document.body.appendChild(this.notificationElement);

        try {
            this.plugins = [];
            this.initializationOrder = [];
            this.disabledPlugins = [];
            registerPlugins(this);
        } catch (e) {
            this.addNotification("error", "Error", `Unrecoverable error initializing Ace: '${e}'. Ace will disable itself.`);
            this.dormant = true;
            return;
        }

        this.fetchBuiltinPluginInformation().then(() => {
            if (this.dormant) return;

            this.hookManager = new HookManager(this);
            this.hookManager.registerHookProvider(HTTP_HOOK);
            this.hookManager.registerHookProvider(REGISTER_ELEMENT_HOOK);
            this.hookManager.registerHookProvider(TEMPLATE_CONTENT_HOOK);
            this.hookManager.registerHookProvider(EMBER_COMPONENT_HOOK);

            this.resolvePluginDependencies();
            this.initializePlugins();
        }).catch(e => {
            // Log error to console.
            console.error(e);

            this.addNotification("error", "Error", `Unrecoverable error initializing Ace: '${e}'. Ace will disable itself.`);
            this.dormant = true;
            return;
        });
    }

    /**
     * Registers a new plugin
     */
    registerPlugin(plugin: Plugin) {
        if (this.plugins.filter(x => x.name === plugin.name).length) {
            this.addNotification("warning", "Warning", "Duplicate plugin '${plugin.name}'. Ignoring the second one.");
        }
        this.plugins.push(plugin);
    }

    /**
     * Returns the built-in plugin with the specified `fullName`, or `null` otherwise.
     */
    getBuiltinPluginWithName(fullName: string): BuiltinPlugin | null {
        const matching = this.builtinPlugins.filter(x => x.info.fullName === fullName);
        return matching.length > 0 ? matching[0] : null;
    }

    /**
     * Returns the plugin with the specified name, or `null` otherwise.
     */
    getPluginWithName(name: String): Plugin | null {
        const matching = this.plugins.filter(x => x.name === name);
        return matching.length > 0 ? matching[0] : null;
    }

    /**
     * Returns a promise that resolves when the API for the specified built-in
     * plugin is loaded and available.
     */
    getBuiltinApi(name: string): Promise<any> {
        if (this.getBuiltinPluginWithName(name)!.isInitialized) {
            return Promise.resolve(this.getBuiltinPluginWithName(name)!.api);
        }

        return new Promise(resolve => {
            (this.postinitHooks[name] = (this.postinitHooks[name] || [])).push(plugin => {
                resolve(plugin.api);
            });
        });
    }

    /**
     * Uses the built-in LCU api to gather information on the currently running "native" plugins.
     */
    private fetchBuiltinPluginInformation(): Promise<void> {
        return simple_promise_fetch("/plugin-manager/v2/plugins").then(json => {
            const plugins = JSON.parse(json) as PluginInfo[];
            this.builtinPlugins = plugins.map(p => new BuiltinPlugin(p));

            // Resolve dependencies.
            this.builtinPlugins.forEach(plugin => {
                plugin.dependencies = plugin.info.dependencies.map(x => {
                    const dep = this.getBuiltinPluginWithName(x.fullName);
                    if (!dep) this.addNotification("warning", "Warning", `Native plugin ${plugin.info.fullName} specified missing dependency ${x.fullName}.`);
                    return dep!;
                });
            });
        }).catch(e => {
            // Log error to console.
            console.error(e);

            this.addNotification("error", "Error", `Unrecoverable error while communicating with server: ${e}. Ace will disable itself.`);
            this.dormant = true;
        });
    }

    /**
     * This is called by the injected code whenever the script tag has loaded.
     * We then perform some dark magic to intercept the provider and api.
     */
    /*private*/ handleOnLoad(entry: { pluginName: string, document: Document, originalLoad: () => void }) {
        if (this.dormant) {
            entry.originalLoad();
            return;
        }

        // If we haven't loaded the plugin info yet, delay the initialization.
        if (this.builtinPlugins.length === 0) {
            this.pendingOnloads.push(entry);
            return;
        }

        // If we had plugins we hadn't yet initialized, do it now.
        if (this.pendingOnloads.length) {
            const clone = this.pendingOnloads.slice();
            this.pendingOnloads = [];
            clone.forEach(pending => this.handleOnLoad(pending));
        }

        const nativePlugin = this.getBuiltinPluginWithName(entry.pluginName);
        if (!nativePlugin) {
            this.addNotification("error", "Error", `Ace encountered a native plugin it didn't recognize and cannot continue. Ace will disable itself.`);
            this.dormant = true;
            return;
        }

        this.initializeBuiltinPlugin(nativePlugin, entry.document, entry.originalLoad);
    }

    /**
     * Initializes the previously intercepted built-in plugin.
     */
    private initializeBuiltinPlugin(plugin: BuiltinPlugin, doc: Document, onload: () => void) {
        const self = this;

        // Step 1: Intercept document.dispatchEvent to get access to the riotPlugin.announce event.
        // This event contains the provider that has various bindings interesting to us.
        wrap_method(doc, "dispatchEvent", function(original: (ev: AnnounceEvent) => void, [event]: [AnnounceEvent]) {
            // If the event being dispatched is not announce, such as the various lifecycle methods,
            // we are not interested in it and let the native code take over.
            if (event.type !== "riotPlugin.announce") {
                return original(event);
            }
            
            // Step 2: We pretend to be the plugin and ask for the provider.
            // registrationHandler expects us to return a promise to the eventual
            // plugin api, so we construct a promise that we resolve later.
            event.registrationHandler(p => {
                return new Promise(resolve => {
                    // Step 3: We construct a fake riotPlugin.announce event that we
                    // relay to the _actual_ plugin code. This way we get access to the
                    // resulting api that the plugin exports.
                    const fakeEvent = new Event("riotPlugin.announce") as AnnounceEvent;
                    fakeEvent.errorHandler = event.errorHandler;
                    fakeEvent.uiIsReady = event.uiIsReady;
                    fakeEvent.registrationHandler = handler => {
                        let result = handler(p);
                        result = result && result.then ? result : Promise.resolve(result); // Convert to promise.

                        result.then((api: any) => {
                            plugin.isInitialized = true;
                            plugin.api = api;
                            plugin.provider = p;

                            if (self.postinitHooks[plugin.info.fullName]) {
                                self.postinitHooks[plugin.info.fullName].forEach(f => f(plugin));
                            }

                            // At this point we have the api, so we are ready to resolve
                            // the promise that we delivered in step 2.
                            resolve(api);
                        });
                    };

                    if (self.preinitHooks[plugin.info.fullName]) {
                        self.preinitHooks[plugin.info.fullName].forEach(f => f(plugin));
                    }

                    // Step 4: Relay this fake event to the original plugin code.
                    original(fakeEvent);
                });
            });
        });

        // This call here informs `rcp-fe-plugin-loader` that our plugin is ready to initialize.
        // This will (eventually) call document.dispatchEvent, thus arriving at the code above.
        onload();
    }

    /**
     * Checks if every plugin dependency is statisfied and topologically sorts `this.plugins`
     * so that the order of initialization statisfies the dependencies. Errors if there is a
     * cyclic dependency or if a dependency is not statisfied by the current plugins. Should
     * not be called more than once, and should only be called once all plugins are initialized.
     */
    private resolvePluginDependencies() {
        // Step 1: Resolve plugin dependencies.
        this.plugins.forEach(plugin => {
            Object.keys(plugin.description.dependencies || {}).forEach(depName => {
                const dep = this.getPluginWithName(depName);

                if (!dep) {
                    plugin.state = PluginState.UNMET_DEPENDENCY;
                    return;
                }

                plugin.dependencies.push(dep);
                dep.dependents.push(plugin);
            });
        });

        // Step 2: Mark disabled plugins as disabled.
        this.disabledPlugins.forEach(p => {
            const plugin = this.getPluginWithName(p);

            // We don't warn since it normally isn't a problem if an old plugin has been removed.
            if (plugin) plugin.state = PluginState.DISABLED;
        });

        // Step 3: Resolve and version check built-in dependencies.
        this.plugins.forEach(plugin => {
            if (plugin.state !== PluginState.LOADED) return;

            Object.keys(plugin.description.builtinDependencies || {}).forEach(depName => {
                // Anonymous function for easier control flow.
                plugin.state = (() => {
                    const depVer = plugin.description.builtinDependencies![depName];

                    const dep = this.getBuiltinPluginWithName(depName);
                    if (!dep) return PluginState.UNMET_BUILTIN_DEPENDENCY; // Builtin dep not found.

                    const range = semver.validRange(depVer);
                    if (!range) return PluginState.UNMET_BUILTIN_DEPENDENCY; // Invalid version range.
                    if (!semver.satisfies(dep.info.version, range)) return PluginState.UNMET_BUILTIN_DEPENDENCY; // Not statisfied.

                    // Everything is fine.
                    return PluginState.LOADED;
                })();
            });
        });

        // Step 4: Resolve and version check normal dependencies.
        this.plugins.forEach(plugin => {
            if (plugin.state !== PluginState.LOADED) return;

            plugin.dependencies.forEach(dep => {
                const depVer = plugin.description.dependencies![dep.name];
                const range = semver.validRange(depVer);

                plugin.state =
                    range && semver.satisfies(dep.description.version, range)
                    ? PluginState.LOADED
                    : PluginState.UNMET_DEPENDENCY;
            });
        });

        // Step 5: Topologically sort plugins to find a correct initialization order.
        // Yes, I am aware this is some real interesting code.
        const dependencies: [string, string][] = Array.prototype.concat(...this.plugins.filter(x => x.state === PluginState.LOADED).map(p => {
            return p.dependencies.map(x => [p.name, x.name]);
        }))

        try {
            this.initializationOrder = toposort(dependencies)
                .reverse()
                // Add plugins that don't depend on anything/get depended upon, since they were not in the topological sort.
                .concat(this.plugins.filter(x => x.state === PluginState.LOADED && x.dependents.length === 0 && x.dependencies.length === 0).map(x => x.name));
        } catch (e) {
            // Cyclic dependency, disable anything that depends on something else since we can't easily figure out the loop.
            this.plugins.filter(x => x.state === PluginState.LOADED && (x.dependents.length !== 0 || x.dependencies.length !== 0)).forEach(p => {
                p.state = PluginState.UNMET_DEPENDENCY;
            });

            // Just initialize non-dependents/depended plugins normally.
            this.initializationOrder = this.plugins.filter(x => x.state === PluginState.LOADED && x.dependents.length === 0 && x.dependencies.length === 0).map(x => x.name);

            this.addNotification("warning", "Warning", "Cyclic dependency found. Disabling all plugins that depend on something.");
        }
    }

    /**
     * Simply calls initialize on every Plugin instance.
     */
    private initializePlugins() {
        if (this.dormant) return;

        this.initializationOrder.map(x => this.getPluginWithName(x)!).forEach(plugin => {
            if (plugin.state !== PluginState.LOADED) return;

            try {
                plugin.setup();
            } catch (e) {
                // Log error to console.
                console.error(e);

                // Disable plugins that depend on this one.
                plugin.state = PluginState.ERRORED;

                this.addNotification("warning", "Warning", `Error during initialization of '${plugin}': ${e}.`);
            }
        });
    }

    /**
     * Adds a new notification that deletes itself when the X is pressed.
     */
    private addNotification(type: string, title: string, contents: string) {
        const html = `<div class="notification ${type}">
            <span class="title">${title}</span>
            <span class="not-message">${contents}</span>
  	        <span class="close"><span class="cl1"></span><span class="cl2"></span></span>
        </div>`;

        const tmp = document.createElement("div");
        tmp.innerHTML = html;

        const el = tmp.children[0];        
        el.querySelector(".close").addEventListener("click", () => {
            el.parentElement.removeChild(el);
        });
        this.notificationElement.appendChild(el);
    }
}

interface AnnounceEvent extends Event {
    registrationHandler: (takesProvider: (provider: any) => Promise<any> | any) => void;
    errorHandler: () => any;
    uiIsReady: () => any;
}