"use strict";

import Vue = require("vue/dist/vue.js");
import Component from "../../../util/component-decorator";
import SettingsAPI from "../../settings/api";
import Ace from "../../../ace";
import { Group } from "../index";
import { simple_promise_fetch } from "../../../util";

import LAYOUT = require("./layout.html");
import "./style";

/**
 * Wrapped in a closure so we get access to the settings api.
 */
export default function(ace: Ace, settings: SettingsAPI) {
    // Create default structure if it doesn't exist.
    if (!settings.settings.championGroups) {
        // this merges.
        settings.settings = {
            championGroups: {
                groups: []
            }
        };
    }

    @Component({
        template: LAYOUT
    })
    class ChampionGroupsConfigPanel extends Vue {
        groups: Group[];
        currentGroup: Group | null;

        champions: { name: string, id: number }[];
        loading: boolean;

        data() {
            const groups = settings.settings.championGroups.groups;

            return {
                groups,
                currentGroup: groups[0] || null,
                champions: [],
                loading: true
            };
        }

        /**
         * Called when the settings panel is loaded, loads the champions.
         */
        created() {
            simple_promise_fetch("/lol-login/v1/session").then(data => {
                const summonerId = JSON.parse(data).summonerId;
                return simple_promise_fetch(`/lol-collections/v1/inventories/${summonerId}/champions`);
            }).then(championJson => {
                this.champions = JSON.parse(championJson).sort(sortAlphabetically);
                this.loading = false;
            });
        }

        /**
         * Called before the settings panel is unloaded, saves the settings.
         */
        beforeDestroy() {
            settings.save();
        }

        /**
         * Selects the specified group and shows it on the right hand side.
         */
        selectGroup(group: Group) {
            this.currentGroup = group;
        }

        /**
         * Checks if the specified champion is part of the currently selected group.
         */
        isSelected(champ: { id: number }) {
            return this.currentGroup!.championIds.indexOf(champ.id) !== -1;
        }

        /**
         * Either adds or removes the specified champion from the current group.
         */
        toggleChampion(champ: { id: number }) {
            const idx = this.currentGroup!.championIds.indexOf(champ.id);
            if (idx !== -1) {
                this.currentGroup!.championIds.splice(idx, 1);
            } else {
                this.currentGroup!.championIds.push(champ.id);
            }
        }

        /**
         * Shows the prompt that asks for a new group name.
         */
        promptGroupAdd() {
            let dialog: { acceptPromise: PromiseLike<void>, domNode: Element };

            ace.getBuiltinApi("rcp-fe-lol-uikit").then(uikit => {
                const contents = uikit.getTemplateHelper().contentBlockDialog(
                    "Add new group",
                    `<lol-uikit-flat-input><input type="text" placeholder="My Custom Group"></lol-uikit-flat-input>`
                );
                
                dialog = uikit.getModalManager().add({
                    type: "DialogConfirm",
                    show: true,
                    data: {
                        contents,
                        acceptText: "Add",
                        declineText: "Cancel"
                    }
                });

                return dialog.acceptPromise;
            }).then(() => {
                // Accepted, add new group.
                this.groups.push({
                    name: dialog.domNode.querySelector("input").value,
                    championIds: []
                });
            }, () => { /* Do nothing. */ });
        }

        /**
         * Removes the currently selected group, if one is selected.
         */
        removeGroup() {
            if (!this.currentGroup) return;

            // Ask for verification.
            ace.getBuiltinApi("rcp-fe-lol-uikit").then(uikit => {
                const contents = uikit.getTemplateHelper().contentBlockDialog("Are you sure?", `Do you really want to remove '${this.currentGroup!.name}'?`);
                const dialog: { acceptPromise: PromiseLike<void>, domNode: Element } = uikit.getModalManager().add({
                    type: "DialogConfirm",
                    show: true,
                    data: {
                        contents,
                        acceptText: "Remove",
                        declineText: "Cancel"
                    }
                });

                return dialog.acceptPromise;
            }).then(() => {
                // Accepted, remove the group.
                this.groups.splice(this.groups.indexOf(this.currentGroup!), 1);
                this.currentGroup = this.groups[0] || null;
            }, () => { /* Do nothing. */ });
        }
    };

    return ChampionGroupsConfigPanel;
}

function sortAlphabetically(a: { name: string }, b: { name: string }) {
    if (a.name > b.name) return 1;
    if (a.name < b.name) return -1;
    return 0;
}