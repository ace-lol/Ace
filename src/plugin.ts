"use strict";

import { throw_expr } from "./util";
import { Callback } from "./hook-providers";
import Ace from "./ace";

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

    toString() {
        return `${this.description.name}@${this.description.version}`;
    }

    /**
     * Shortcut to register a new hook for the current plugin.
     * @see HookManager#hook
     */
    hook(hookName: string, callback: Callback, ...matchers: any[]) {
        this.ace.hookManager.hook(this, hookName, callback, ...matchers);
    }

    /**
     * Gets the plugin with the specified name. Throws if the plugin is not installed.
     */
    getPlugin(name: string): Plugin {
        return this.ace.getPluginWithName(name) || throw_expr(`No plugin with name ${name}`);
    }
}