"use strict";

import { PluginDescription } from "../../plugin";
import SettingsAPI from "../settings/api";
import createConfigPanel from "./config-panel";

import "./style";

/**
 * Represents a group of champions that can be sorted upon.
 */
export interface Group {
    name: string;
    icon: string;
    championIds: number[];
}

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
        settingsApi.addSettingsView(this, createConfigPanel(this.ace, settingsApi));

        this.preinit("rcp-fe-lol-champ-select", () => {
            let unregister = this.hook("ember-component", Ember => {
                unregister();
                return Mixin(Ember, settingsApi);
            }, "champion-grid");
        });
    }
});

const DEFAULT_GROUPS = ["fighter", "tank", "mage", "assassin", "support", "marksman"];

const Mixin = (Ember: any, settingsApi: SettingsAPI) => ({
    // needsUpdate is simply to force Ember to recompute the roleFilters.
    needsUpdate: false,
    addSettingChangeObserver: Ember.on("didInsertElement", function() {
        settingsApi.addSettingsListener(() => {
            this.set("needsUpdate", !this.get("needsUpdate"));
        });
    }),

    roleFilters: Ember.computed("needsUpdate", function() {
        // This is the default behaviour in rcp-fe-lol-champ-select.
        let groups = settingsApi.get("championGroups.showDefault", true) ? DEFAULT_GROUPS.map(group => Ember.Object.create({
            name: group,
            value: false,
            displayName: group
        })) : [];

        const customGroups: Group[] = settingsApi.get("championGroups.groups", []);
        groups = groups.concat(customGroups.map(group => Ember.Object.create({
            name: group.name + " _custom",
            value: false,
            displayName: group.name
        })));

        // Add custom icons.
        Ember.run.scheduleOnce('afterRender', this, function() {
            customGroups.forEach(group => {
                const el: Element = this.$(`.role${group.name.split(" ").map(x => "." + x).join()}._custom`)[0];
                el.setAttribute("icon", group.icon);
            });
        });
        
        return Ember.A(groups);
    }),

    // This is the default behaviour in rcp-fe-lol-champ-select.
    roleFilter: Ember.computed("selectedRoleNames", function() {
        const selected = this.get("selectedRoleNames");

        // If no roles selected, return true.
        if (!selected || selected.length < 1) return function() { return true; };

        // Changes start here.
        const matchers: ((champ: any) => boolean)[] = selected.map((name: string) => {
            if (name.indexOf(" _custom") === -1) {
                // Normal matcher, check if the champion has the primary role.
                return function(champ: any) {
                    return champ && champ.get("roles.0") === name;
                };
            }

            // Custom matcher, find the matching group.
            const customGroups: Group[] = settingsApi.get("championGroups.groups", []);
            const group = customGroups.filter(x => x.name === name.slice(0, -8))[0];

            // Check if the champion was in the Group.
            return function(champ: any) {
                return champ && group.championIds.indexOf(champ.get("id")) !== -1;
            };
        });

        return function(champ: any) {
            // Reduce to see if any matchers match.
            return matchers.reduce((prev, fn) => prev || fn(champ), false);
        };
    }),
});