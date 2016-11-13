"use strict";

import { simple_promise_fetch } from "../../util";
import Plugin from "../../plugin";
import Vue = require("vue/dist/vue.js");

export default class API {
    private localSettings: any;
    private dirty: boolean;
    private pluginSettings: { [name: string]: Vue };

    constructor() {
        this.localSettings = {};
        this.pluginSettings = {};
        this.dirty = false;

        simple_promise_fetch("/lol-settings/v1/local/ace").then(json => {
            const data = JSON.parse(json);
            this.localSettings = data.data;
        });
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
     * Gets a copy of the local settings.
     */
    get settings() {
        return (<any>Object).assign({}, this.localSettings);
    }

    /**
     * Sets the local copy of the settings. This performs a diff and only changes the changed properties.
     */
    set settings(newSettings: any) {
        this.localSettings = (<any>Object).assign(this.localSettings, newSettings);
        this.dirty = true;
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