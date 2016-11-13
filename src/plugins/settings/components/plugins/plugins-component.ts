"use strict";

import Component from "../../../../util/component-decorator";
import Vue = require("vue/dist/vue.js");
import Promise = require("bluebird");

import RootComponent from "../root/root-component";

import Ace from "../../../../ace";
import Plugin, { PluginState } from "../../../../plugin";

import LAYOUT = require("./layout.html");
import "./style";

@Component({
    template: LAYOUT
})
export default class PluginsComponent extends Vue {
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
                    // TODO: Save settings, restart.
                    return true;
                }, () => {
                    // Not accepted. Don't close the modal.
                    return false;
                });
            });
        });
    }

    data() {
        return {
            pendingToggles: []
        };
    }

    /**
     * Returns a string signifying the state the plugin is currently in.
     */
    getPluginState(plugin: Plugin) {
        const state = PluginState[plugin.state].toLowerCase().replace("_", "");
        return state[0] + state.slice(1);
    }

    /**
     * Returns if this plugin has a custom settings panel registered.
     */
    hasSettings(plugin: Plugin) {
        return false;
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
     * Returns the text in the tooltip displayed when hovering over the disable/enable button.
     */
    getToggleTooltip(plugin: Plugin) {
        if (this.pendingToggles.indexOf(plugin.name) !== -1) {
            const change = plugin.state === PluginState.DISABLED ? "enabled" : "disabled";
            const keep = plugin.state === PluginState.DISABLED ? "disabled" : "enabled";
            return `This plugin will be ${change} after saving. Press again to keep the plugin ${keep}.`;
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

    get plugins() {
        return (<Ace>(<any>window).Ace).plugins;
    }
}