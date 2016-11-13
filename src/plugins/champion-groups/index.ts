"use strict";

import { PluginDescription } from "../../plugin";
import createConfigPanel from "./config-panel"; 

export default (<PluginDescription>{
    name: "champion-groups",
    version: "0.1.0",
    description: "Custom champion select champion filters.",
    dependencies: {
        "settings": "0.1.x"
    },
    builtinDependencies: {
        "rcp-fe-lol-champ-select": "1.0.x"
    },
    setup() {
        // Register settings view.
        const settingsApi = this.getPlugin("settings").api;
        settingsApi.addSettingsView(this, createConfigPanel(settingsApi));

        this.preinit("rcp-fe-lol-champ-select", () => {
            let unregister = this.hook("ember-component", Ember => {
                unregister();
                return Mixin(Ember);
            }, "champion-grid");
        });
    }
});

const ROLES = ["fighter", "tank", "mage", "assassin", "support", "marksman"];

const Mixin = (Ember: any) => ({
    roleFilters: Ember.computed(function() {
        // This is the default behaviour in rcp-fe-lol-champ-select.
        return Ember.A(ROLES.map(role => {
            return Ember.Object.create({
                name: role,
                value: false,
                displayName: role
            });
        }));
    })
});