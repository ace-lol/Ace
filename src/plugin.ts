"use strict";

import { throw_expr } from "./util";
import { Callback } from "./hook-providers";
import BuiltinPlugin from "./builtin-plugin";
import Ace, { LifecycleCallback } from "./ace";
import Promise = require("bluebird");

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
 * Represents a state that a plugin can be in.
 */
export enum PluginState {
    /**
     * The plugin is loaded, but dependencies have not yet been checked for problems.
     */
    LOADED,

    /**
     * The plugin was disabled by the user.
     */
    DISABLED,

    /**
     * The plugin was not loaded because there was a problem with its dependencies.
     */
    UNMET_DEPENDENCIES,

    /**
     * The plugin was successfully loaded and enabled. Its api is now available for use.
     */
    ENABLED
}

/**
 * This is an instance of a Plugin for Ace.
 */
export default class Plugin {
    readonly ace: Ace;
    readonly description: PluginDescription;

    // The plugin instances this plugin depends on.
    dependencies: Plugin[];
    // All plugins that depend on this plugin.
    dependents: Plugin[];

    state: PluginState;
    private _api: any | null;

    constructor(ace: Ace, description: PluginDescription) {
        this.ace = ace;
        this.description = description;

        this.dependencies = [];
        this.dependents = [];

        this.state = PluginState.LOADED;
    }

    /**
     * Initializes this plugin. Throws if the plugin is already initialized.
     */
    setup() {
        if (this.state !== PluginState.LOADED) throw `Plugin ${this} can not be initialized at this point.`;

        this._api = this.description.setup.call(this);
        this.state = PluginState.LOADED;
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
        if (this.state !== PluginState.ENABLED) throw `Accessing API of ${this}, which is not enabled.`;
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
     * Returns a promise that resolves when the exported API for the specified
     * built-in plugin is available.
     */
    getBuiltinApi(pluginName: string): Promise<any> {
        return this.ace.getBuiltinApi(pluginName);
    }

    /**
     * Overrides toString to print `NAME@VERSION`.
     */
    toString() {
        return `${this.description.name}@${this.description.version}`;
    }
}