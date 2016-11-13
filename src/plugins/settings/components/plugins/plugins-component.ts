"use strict";

import Component from "../../../../util/component-decorator";
import Vue = require("vue/dist/vue.js");

import RootComponent from "../root/root-component";

import Ace from "../../../../ace";
import Plugin, { PluginState } from "../../../../plugin";

import LAYOUT = require("./layout.html");
import "./style";

@Component({
    template: LAYOUT
})
export default class PluginsComponent extends Vue {
    activeSettingsView: Vue | null;
    activeSettingsPlugin: Plugin | null;

    pendingToggles: string[];
    $parent: RootComponent;

    created() {
        this.$parent.addCloseListener(() => {
            // If we have no pending changes, exit immediately.
            if (this.pendingToggles.length === 0) return Promise.resolve(true);
            
            return this.$parent.ace.getBuiltinApi("rcp-fe-lol-uikit").then(uikit => {
                // Create a confirm modal using the uikit api.
                const contents = uikit.getTemplateHelper().contentBlockDialog("Are you sure?", "Saving your changes will restart the League client.");
                const dialog: { acceptPromise: PromiseLike<void>, domNode: Element } = uikit.getModalManager().add({
                    type: "DialogConfirm",
                    show: true,
                    data: {
                        contents,
                        acceptText: "Save",
                        declineText: "Cancel"
                    }
                });

                return dialog.acceptPromise.then(() => {
                    // User pressed 'Save', change and then return.
                    const existing = this.$parent.api.settings.disabledPlugins || [];

                    // Remove or add the plugin, based on its previous state.
                    this.pendingToggles.forEach(name => {
                        const idx = existing.indexOf(name);
                        if (idx !== -1) {
                            existing.splice(idx, 1);
                        } else {
                            existing.push(name);
                        }
                    });

                    // Queue changes.
                    this.$parent.api.settings = { disabledPlugins: existing };

                    return this.$parent.api.save().then(() => {
                        // Reload the page.
                        window.location.reload();

                        // This never returns, but oh well.
                        return true;
                    });
                }, () => {
                    // Not accepted. Don't close the modal.
                    return false;
                });
            });
        });
    }

    data() {
        return {
            pendingToggles: [],
            activeSettingsView: null
        };
    }

    /**
     * Returns a string signifying the state the plugin is currently in.
     */
    getPluginState(plugin: Plugin) {
        const state = PluginState[plugin.state].toLowerCase().replace("_", "");
        return state[0].toUpperCase() + state.slice(1);
    }

    /**
     * Returns if this plugin has a custom settings panel registered.
     */
    hasSettings(plugin: Plugin) {
        return this.$parent.api.getSettingsView(plugin) !== null;
    }

    /**
     * Returns either "Disable" or "Enable", depending on the plugin state and previous changes.
     */
    getToggleText(plugin: Plugin) {
        const canDisable = plugin.state !== PluginState.DISABLED;
        const hasToggle = this.pendingToggles.indexOf(plugin.name) !== -1;

        if (hasToggle) return canDisable ? "Enable*" : "Disable*";
        return canDisable ? "Disable" : "Enable";
    }

    /**
     * Returns if the specified plugin can be disabled/enabled.
     */
    canToggle(plugin: Plugin) {
        if (plugin.name === "settings") return false;

        return true;
    }

    /**
     * Returns if the specified plugin is currently active.
     */
    isActive(plugin: Plugin) {
        return plugin.state === PluginState.ENABLED;
    }

    /**
     * Returns the text in the tooltip displayed when hovering over the disable/enable button.
     */
    getToggleTooltip(plugin: Plugin) {
        if (this.pendingToggles.indexOf(plugin.name) !== -1) {
            const change = plugin.state === PluginState.DISABLED ? "enabled" : "disabled";
            const keep = plugin.state === PluginState.DISABLED ? "disabled" : "enabled";
            return `This plugin will be ${change} after a restart.<br>Click again to keep the plugin ${keep}.`;
        }

        if (this.canToggle(plugin)) return null;
        if (plugin.name === "settings") return "This plugin is essential and cannot be disabled.";
    }

    /**
     * Marks the specified plugin as needing to be toggled.
     */
    toggle(plugin: Plugin) {
        const idx = this.pendingToggles.indexOf(plugin.name);
        if (idx !== -1) {
            this.pendingToggles.splice(idx, 1);
        } else {
            this.pendingToggles.push(plugin.name);
        }
    }

    /**
     * Opens the plugin specific settings for the specified plugin.
     */
    openSettings(plugin: Plugin) {
        if (!this.hasSettings(plugin)) return;

        this.activeSettingsView = this.$parent.api.getSettingsView(plugin);
        this.activeSettingsPlugin = plugin;
    }

    /**
     * Closes the plugin specific settings.
     */
    closeSettings() {
        this.activeSettingsView = null;
        this.activeSettingsPlugin = null;
    }

    get plugins() {
        return (<Ace>(<any>window).Ace).plugins;
    }
}