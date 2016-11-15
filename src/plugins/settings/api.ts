"use strict";

import { simple_promise_fetch } from "../../util";
import Plugin from "../../plugin";
import Vue = require("vue/dist/vue.js");

export default class API {
    private localSettings: any;
    private dirty: boolean;
    private settingListeners: (() => void)[];
    private pluginSettings: { [name: string]: Vue };

    constructor() {
        this.localSettings = {};
        this.pluginSettings = {};
        this.settingListeners = [];
        this.dirty = false;
    }

    /**
     * Registers a custom settings view for the specified plugin.
     */
    addSettingsView(plugin: Plugin, component: Vue) {
        this.pluginSettings[plugin.name] = component;
    }

    /**
     * Returns the custom settings view for the plugin, or null if not applicable.
     */
    getSettingsView(plugin: Plugin): Vue | null {
        return this.pluginSettings[plugin.name] || null;
    }

    /**
     * Adds a new settings listener that gets triggered whenever the settings update.
     */
    addSettingsListener(fn: () => void) {
        this.settingListeners.push(fn);
    }

    /**
     * Gets a copy of the local settings.
     */
    getSettings(): {} {
        return (<any>Object).assign({}, this.localSettings);
    }

    /**
     * Gets the object at the specified "path", or the default if it does not exist.
     * This method is intended as a helper for default settings.
     */
    get<T>(path: string, defaultValue: T): T {
        const parts = path.split(".");
        if (parts.length === 0) return defaultValue;

        let current: any = this.getSettings();
        for (let i = 0; i < parts.length; i++) {
            if (typeof current !== "object") return defaultValue;
            current = current[parts[i]];
        }

        return typeof current === "undefined" ? defaultValue : current; 
    }

    /**
     * Merges the provided settings with the current settings.
     * Prioritizes new settings over old settings. Does not save.
     */
    mergeSettings(newSettings: {}) {
        this.localSettings = (<any>Object).assign(this.localSettings, newSettings);
        this.dirty = true;
        this.settingListeners.forEach(f => f());
    }

    /**
     * Loads the current settings from the server.
     */
    load(): Promise<void> {
        return simple_promise_fetch("/lol-settings/v1/local/ace").then(json => {
            const data = JSON.parse(json);
            this.localSettings = data.data || {};
        });
    }

    /**
     * Saves the changed properties to the server and returns a promise that resolves when the saving is done.
     * Resolves immediately if there are no changes.
     */
    save(): Promise<void> {
        if (!this.dirty) return Promise.resolve();

        return new Promise<void>(resolve => {
            const http = new XMLHttpRequest();
            http.open("PATCH", "/lol-settings/v1/local/ace", true);
            http.setRequestHeader("Content-Type", "application/json");
            http.onreadystatechange = () => {
                if (http.readyState === XMLHttpRequest.DONE) {
                    this.dirty = false;
                    resolve();
                }
            };
            http.send(JSON.stringify({ data: this.localSettings, schemaVersion: 1 }));
        });
    }
}