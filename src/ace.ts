"use strict";

import { simple_fetch, throw_expr, wrap_method } from "./util";
import BuiltinPlugin, { PluginInfo } from "./builtin-plugin";
import Plugin from "./plugin";
import HookManager from "./hook-manager";
import registerPlugins from "./plugins";

import toposort = require("toposort");
import Promise = require("bluebird");
import semver = require("semver");

import * as HTTP_HOOK from "./hook-providers/http";
import * as REGISTER_ELEMENT_HOOK from "./hook-providers/register-element";
import * as TEMPLATE_CONTENT_HOOK from "./hook-providers/template-content";

export type LifecycleCallback = (plugin: BuiltinPlugin) => void;

export default class Ace {
    builtinPlugins: BuiltinPlugin[];
    plugins: Plugin[];
    hookManager: HookManager;

    preinitHooks: { [name: string]: LifecycleCallback[] };
    postinitHooks: { [name: string]: LifecycleCallback[] };

    constructor() {
        this.builtinPlugins = [];
        this.preinitHooks = {};
        this.postinitHooks = {};

        this.hookManager = new HookManager();
        this.hookManager.registerHookProvider(HTTP_HOOK);
        this.hookManager.registerHookProvider(REGISTER_ELEMENT_HOOK);
        this.hookManager.registerHookProvider(TEMPLATE_CONTENT_HOOK);

        this.plugins = [];
        registerPlugins(this);

        this.fetchBuiltinPluginInformation().then(() => {
            this.resolvePluginDependencies();
            this.initializePlugins();
        });
    }

    /**
     * Registers a new plugin
     */
    registerPlugin(plugin: Plugin) {
        if (this.plugins.filter(x => x.name === plugin.name).length) throw `There is already a plugin named ${plugin.name} registered.`;
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
        return new Promise<void>(resolve => {
            simple_fetch("/plugin-manager/v2/plugins", json => {
                const plugins = JSON.parse(json) as PluginInfo[];
                this.builtinPlugins = plugins.map(p => new BuiltinPlugin(p));

                // Resolve dependencies.
                this.builtinPlugins.forEach(plugin => {
                    plugin.dependencies = plugin.info.dependencies.map(x => {
                        return this.getBuiltinPluginWithName(x.fullName) || throw_expr(`Missing builtin plugin dependency ${JSON.stringify(x)} for ${plugin.info.fullName}.`);
                    });
                });

                resolve();
            });
        });
    }

    /**
     * This is called by the injected code whenever the script tag has loaded.
     * We then perform some dark magic to intercept the provider and api.
     */
    /*private*/ handleOnLoad(entry: { pluginName: string, document: Document, originalLoad: () => void }) {
        this.initializeBuiltinPlugin(
            this.getBuiltinPluginWithName(entry.pluginName) || throw_expr(`Onload for nonexisting builtin plugin ${entry.pluginName}?`),
            entry.document,
            entry.originalLoad
        );
    }

    /**
     * Initializes the previously intercept built-in plugin.
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
        // Step 1: Check dependencies and prepare the topological sort.
        const edges: [string, string][] = [];
        const standalone: Plugin[] = []; 
        this.plugins.forEach(plugin => {
            const deps = plugin.description.dependencies || {};

            if (Object.keys(deps).length <= 0) {
                // We need to keep track of the standalone plugins, since they
                // will not show up in the `edges` array. We add these standalone
                // plugins later, after all depended plugins are loaded.
                standalone.push(plugin);
            }

            Object.keys(deps).forEach(depName => {
                const range = semver.validRange(deps[depName]);
                if (!range) throw `Invalid dependency: ${plugin} specifies ${depName}@${deps[depName]}, which is not a valid version format.`;
                const dep = this.getPluginWithName(depName) || throw_expr(`Unmet dependency: ${plugin} depends on ${depName}, which is not installed or loaded.`);
                if (!semver.satisfies(dep.description.version, range)) throw `Unmet dependency: ${plugin} depends on ${depName}@${deps[depName]} (${range}), but ${dep} is installed.`;

                edges.push([plugin.name, depName]);
            });

            const nativeDeps = plugin.description.builtinDependencies || {};
            Object.keys(nativeDeps).forEach(depName => {
                const pl = this.getBuiltinPluginWithName(depName);
                if (!pl) throw `Unmet built-in dependency: ${plugin} depends on ${depName}, which is not installed or loaded.`;
                if (!semver.valid(pl.info.version)) throw `Invalid built-in plugin: ${depName} does not have a valid semver version (${pl.info.version})`;

                const range = semver.validRange(nativeDeps[depName]);
                if (!range) throw `Invalid built-in dependency: ${plugin} specifies ${depName}@${nativeDeps[depName]}, which is not a valid version format.`;
                if (!semver.satisfies(pl.info.version, range)) throw `Unmet built-in dependency: ${plugin} depends on ${depName}@${nativeDeps[depName]} (${range}), but ${pl.info.version} is installed.`;
            });
        });

        try {
            // Step 2: Topologically sort the array. We reverse here because toposort gives
            // us the most depended upon plugin first. We then add all standalone plugins at
            // the end of the array, since it doesn't matter in which way they are initialized.
            const sortedPlugins = toposort(edges)
                .reverse()
                .map(name => this.getPluginWithName(name)!);

            // Only add plugins that aren't yet in the list.
            this.plugins = sortedPlugins.concat(standalone.filter(p => sortedPlugins.indexOf(p) === -1));
        } catch (e) {
            const culprit = /^Cyclic dependency: "(.*)"$/.exec(e.message)![1];

            // toposort throws an error if there is a cycle.
            throw `Cyclic dependency: A plugin depends on \`${culprit}\`, which eventually depends back on the plugin depending on \`${culprit}\` in the first place.`;
        }
    }

    /**
     * Simply calls initialize on every Plugin instance.
     */
    private initializePlugins() {
        this.plugins.forEach(plugin => {
            plugin.setup();
        });
    }
}

interface AnnounceEvent extends Event {
    registrationHandler: (takesProvider: (provider: any) => Promise<any> | any) => void;
    errorHandler: () => any;
    uiIsReady: () => any;
}