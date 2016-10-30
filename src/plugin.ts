"use strict";

import { throw_expr } from "./util";
import { Callback } from "./hook-providers";
import BuiltinPlugin from "./builtin-plugin";
import Ace, { LifecycleCallback } from "./ace";

export interface PluginDescription {
    /**
     * The name of this plugin.
     */
    name: string;

    /**
     * A semver string of the current version.
     */
    version: string;

    /**
     * A small description what this plugin does.
     */
    description: string;

    /**
     * The plugins that this plugin depends upon.
     * Follows the format { PLUGIN_NAME: SEMVER }
     */
    dependencies?: { [key: string]: string };

    /**
     * The native dependencies that this plugin requires in order to function.
     * Use this to pin down the versions of the plugins that your plugin supports,
     * as to prevent changes done by Riot from causing errors or worse.
     * 
     * This makes the assumption that all Riot built-in plugins have a valid semver version.
     * As of the writing of this code, patch 6.21, this is true. If the built-in plugin does
     * not have a valid semver version, it will _never_ match, thus preventing plugins that
     * rely on the invalid built-in plugin from loading.
     * 
     * Note however that, unlike `dependencies`, this does not guarantee initialization
     * order. `setup` will _always_ be called before a single native plugin initializes. This
     * field should only be used to let Ace verify the requirements your plugin has.
     */
    builtinDependencies?: { [key: string]: string };

    /**
     * Called before the built-in plugins are initialized.
     * The plugin should register its lifecycle listeners here
     * and perform any modifications.
     * 
     * Any value this plugin exports is regarded as its public API,
     * which is then accessible to any other plugins.
     */
    setup: (this: Plugin) => any;
}

/**
 * This is an instance of a Plugin for Ace.
 */
export default class Plugin {
    readonly ace: Ace;
    readonly description: PluginDescription;

    isInitialized: boolean;
    private _api: any | null;

    constructor(ace: Ace, description: PluginDescription) {
        this.ace = ace;
        this.description = description;
    }

    /**
     * Initializes this plugin. Throws if the plugin is already initialized.
     */
    setup() {
        if (this.isInitialized) throw `Plugin ${this} is already initialized.`;

        this._api = this.description.setup.call(this);
        this.isInitialized = true;
    }

    /**
     * Utility method to access the name of this plugin.
     */
    get name() {
        return this.description.name;
    }

    /**
     * Returns the exported api of this plugin.
     * Throws if the plugin has not yet initialized.
     */
    get api() {
        if (!this.isInitialized) throw `Accessing API of ${this} before it has initialized.`;
        return this._api!;
    }

    /**
     * Shortcut to register a new hook for the current plugin.
     * @see HookManager#hook
     */
    hook(hookName: string, callback: Callback, ...matchers: any[]) {
        return this.ace.hookManager.hook(this, hookName, callback, ...matchers);
    }

    /**
     * Gets the plugin with the specified name. Throws if the plugin is not installed.
     */
    getPlugin(name: string): Plugin {
        return this.ace.getPluginWithName(name) || throw_expr(`No plugin with name ${name}`);
    }

    /**
     * Gets the built-in plugin with the specified name. Throws if the plugin is not installed.
     */
    getBuiltinPlugin(name: string): BuiltinPlugin {
        return this.ace.getBuiltinPluginWithName(name) || throw_expr(`No built-in plugin with name ${name}`);
    }

    /**
     * Registers a callback for _just before_ the provided plugin initializes.
     * It is recommended that you attach hooks here, to minimize their lifetime.
     * *Warning*: This does not check if the plugin name is valid.
     */
    preinit(name: string, fn: LifecycleCallback) {
        (this.ace.preinitHooks[name] = (this.ace.preinitHooks[name] || [])).push(fn);
    }

    /**
     * Registers a callback for _just after_ the provided plugin initializes.
     * It is recommended that you unregister hooks here, to minimize their lifetime.
     * *Warning*: This does not check if the plugin name is valid.
     */
    postinit(name: string, fn: LifecycleCallback) {
        (this.ace.postinitHooks[name] = (this.ace.postinitHooks[name] || [])).push(fn);
    }

    /**
     * Overrides toString to print `NAME@VERSION`.
     */
    toString() {
        return `${this.description.name}@${this.description.version}`;
    }
}