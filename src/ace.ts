"use strict";

import { simple_fetch, throw_expr, wrap_method } from "./util";
import BuiltinPlugin, { PluginInfo } from "./builtin-plugin";
import HookManager from "./hook-manager";
import Promise = require("bluebird");

import * as HTTP_HOOK from "./hook-providers/http";
import * as REGISTER_ELEMENT_HOOK from "./hook-providers/register-element";
import * as TEMPLATE_CONTENT_HOOK from "./hook-providers/template-content";

export default class Ace {
    builtinPlugins: BuiltinPlugin[];
    hookManager: HookManager;

    constructor() {
        this.builtinPlugins = [];
        this.fetchBuiltinPluginInformation();

        this.hookManager = new HookManager();
        this.hookManager.registerHookProvider(HTTP_HOOK);
        this.hookManager.registerHookProvider(REGISTER_ELEMENT_HOOK);
        this.hookManager.registerHookProvider(TEMPLATE_CONTENT_HOOK);
    }

    /**
     * Returns the plugin with the specified `fullName`, or `null` otherwise.
     */
    getPluginWithName(fullName: string): BuiltinPlugin | null {
        const matching = this.builtinPlugins.filter(x => x.info.fullName === fullName);
        return matching.length > 0 ? matching[0] : null;
    }

    /**
     * Uses the builtin LCU api to gather information on the currently running plugins.
     */
    private fetchBuiltinPluginInformation(): Promise<void> {
        return new Promise<void>(resolve => {
            simple_fetch("/plugin-manager/v2/plugins", json => {
                const plugins = JSON.parse(json) as PluginInfo[];
                this.builtinPlugins = plugins.map(p => new BuiltinPlugin(p));

                // Resolve dependencies.
                this.builtinPlugins.forEach(plugin => {
                    plugin.dependencies = plugin.info.dependencies.map(x => {
                        return this.getPluginWithName(x.fullName) || throw_expr(`Missing plugin dependency ${JSON.stringify(x)} for ${plugin.info.fullName}.`);
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
    /*effectively private*/ handleOnLoad(entry: { pluginName: string, document: Document, originalLoad: () => void }) {
        this.initializeBuiltinPlugin(
            this.getPluginWithName(entry.pluginName) || throw_expr(`Onload for nonexisting plugin ${entry.pluginName}?`),
            entry.document,
            entry.originalLoad
        );
    }

    /**
     * Initializes the previously intercept built-in plugin.
     */
    private initializeBuiltinPlugin(plugin: BuiltinPlugin, doc: Document, onload: () => void) {
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
                            plugin.api = api;
                            plugin.provider = p;

                            // At this point we have the api, so we are ready to resolve
                            // the promise that we delivered in step 2.
                            resolve(api);
                        });
                    };

                    // Step 4: Relay this fake event to the original plugin code.
                    original(fakeEvent);
                });
            });
        });

        // This call here informs `rcp-fe-plugin-loader` that our plugin is ready to initialize.
        // This will (eventually) call document.dispatchEvent, thus arriving at the code above.
        onload();
    }
}

interface AnnounceEvent extends Event {
    registrationHandler: (takesProvider: (provider: any) => Promise<any> | any) => void;
    errorHandler: () => any;
    uiIsReady: () => any;
}