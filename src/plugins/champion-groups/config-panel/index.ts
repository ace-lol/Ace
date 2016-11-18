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
    @Component({
        template: LAYOUT
    })
    class ChampionGroupsConfigPanel extends Vue {
        groups: Group[];
        currentGroup: Group | null;

        showDefaultGroups: boolean;

        champions: { name: string, id: number }[];

        loading: boolean;
        errored: boolean;
        error: string | null;

        data() {
            // Clone the groups array.
            const groups = settings.get("championGroups.groups", []).slice();

            return {
                groups,
                currentGroup: groups[0] || null,
                showDefaultGroups: settings.get("championGroups.showDefault", true),
                champions: [],
                loading: true,
                errored: false,
                error: null
            };
        }

        /**
         * Called when the settings panel is loaded, loads the champions.
         */
        created() {
            simple_promise_fetch("/lol-login/v1/session").then(data => {
                const summonerId = JSON.parse(data).summonerId;
                return simple_promise_fetch(`/lol-collections/v1/inventories/${summonerId}/champions`);
            }, () => {
                this.errored = true;
                this.loading = false;
            }).then(championJson => {
                if (!championJson) return;
                this.champions = JSON.parse(championJson).sort(sortAlphabetically);
                this.loading = false;
            });
        }

        /**
         * Called before the settings panel is unloaded, saves the settings.
         */
        beforeDestroy() {
            settings.mergeSettings({
                championGroups: {
                    groups: this.groups,
                    showDefault: this.showDefaultGroups
                }
            });
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
            const contents = `
                <lol-uikit-flat-input>
                    <input type="text" placeholder="Group name...">
                </lol-uikit-flat-input>

                <lol-uikit-framed-dropdown style="padding-top: 10px;">
                    ${ICONS.map((icon, i) => `<lol-uikit-dropdown-option value="${icon}" ${i === 0 ? "selected" : ""}>
                        <div class="champion-groups-dropdown-icon"></div>
                        <span>${icon}</span>
                    </lol-uikit-dropdown-option>`).join()}
                </lol-uikit-framed-dropdown>
            `;

            presentDialog(ace, "Add new group", contents, "Add", "Cancel").then(domNode => {
                const name = domNode.querySelector("input").value;
                if (!name) return; // No name, no new group.
                if (this.groups.filter(x => x.name === name).length > 0) return; // Duplicate name, no new group.

                const icon = domNode.querySelector("lol-uikit-dropdown-option[selected]").getAttribute("value")!;

                // Accepted, add new group.
                this.groups.push({
                    name: name,
                    icon,
                    championIds: []
                });
                if (!this.currentGroup) this.currentGroup = this.groups[0];
            }, () => { /* Do nothing. */ });
        }

        /**
         * Shows the prompt that allows the user to edit the group metadata.
         */
        editGroup() {
            if (!this.currentGroup) return;

            const contents = `
                <lol-uikit-flat-input>
                    <input type="text" value="${this.currentGroup.name}">
                </lol-uikit-flat-input>

                <lol-uikit-framed-dropdown style="padding-top: 10px;">
                    ${ICONS.map(icon => `<lol-uikit-dropdown-option value="${icon}" ${icon === this.currentGroup!.icon ? "selected" : ""}>
                        <div class="champion-groups-dropdown-icon"></div>
                        <span>${icon}</span>
                    </lol-uikit-dropdown-option>`).join()}
                </lol-uikit-framed-dropdown>
            `;

            presentDialog(ace, "Edit group", contents, "Save", "Cancel").then(domNode => {
                const name = domNode.querySelector("input").value;
                if (!name) return; // No name, no new group.

                const icon = domNode.querySelector("lol-uikit-dropdown-option[selected]").getAttribute("value")!;

                // Accepted, add new group.
                this.currentGroup!.name = name;
                this.currentGroup!.icon = icon;
            }, () => { /* Do nothing. */ });
        }

        /**
         * Removes the currently selected group, if one is selected.
         */
        removeGroup() {
            if (!this.currentGroup) return;

            // Ask for verification.
            presentDialog(ace, "Are you sure?", `Do you really want to remove '${this.currentGroup!.name}'?`, "Remove", "Cancel").then(() => {
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

function presentDialog(ace: Ace, title: string, contentString: string, accept: string, decline: string): Promise<Element> {
    return ace.getBuiltinApi("rcp-fe-lol-uikit").then(uikit => {
        const contents = uikit.getTemplateHelper().contentBlockDialog(title, contentString);
        const dialog: { acceptPromise: PromiseLike<void>, domNode: Element } = uikit.getModalManager().add({
            type: "DialogConfirm",
            show: true,
            data: {
                contents,
                acceptText: accept,
                declineText: decline
            }
        });

        return dialog.acceptPromise.then(() => Promise.resolve(dialog.domNode));
    });
}

const ICONS = ["account-login", "account-logout", "action-redo", "action-undo", "align-center", "align-left", "align-right", "aperture", "arrow-bottom", "arrow-circle-bottom", "arrow-circle-left", "arrow-circle-right", "arrow-circle-top", "arrow-left", "arrow-right", "arrow-thick-bottom", "arrow-thick-left", "arrow-thick-right", "arrow-thick-top", "arrow-top", "audio", "audio-spectrum", "badge", "ban", "bar-chart", "basket", "battery-empty", "battery-full", "beaker", "bell", "bluetooth", "bold", "bolt", "book", "bookmark", "box", "briefcase", "british-pound", "browser", "brush", "bug", "bullhorn", "calculator", "calendar", "camera-slr", "caret-bottom", "caret-left", "caret-right", "caret-top", "cart", "chat", "check", "chevron-bottom", "chevron-left", "chevron-right", "chevron-top", "circle-check", "circle-x", "clipboard", "clock", "cloud", "cloud-download", "cloud-upload", "cloudy", "code", "cog", "collapse-down", "collapse-left", "collapse-right", "collapse-up", "command", "comment-square", "compass", "contrast", "copywriting", "credit-card", "crop", "dashboard", "data-transfer-download", "data-transfer-upload", "delete", "dial", "document", "dollar", "double-quote-sans-left", "double-quote-sans-right", "double-quote-serif-left", "double-quote-serif-right", "droplet", "eject", "elevator", "ellipses", "envelope-closed", "envelope-open", "euro", "excerpt", "expand-down", "expand-left", "expand-right", "expand-up", "external-link", "eye", "eyedropper", "file", "fire", "flag", "flash", "folder", "fork", "fullscreen-enter", "fullscreen-exit", "globe", "graph", "grid-four-up", "grid-three-up", "grid-two-up", "hard-drive", "header", "headphones", "heart", "home", "image", "inbox", "infinity", "info", "italic", "justify-center", "justify-left", "justify-right", "key", "laptop", "layers", "lightbulb", "link-broken", "link-intact", "list", "list-rich", "location", "lock-locked", "lock-unlocked", "loop", "loop-circular", "loop-square", "magnifying-glass", "map", "map-marker", "media-pause", "media-play", "media-record", "media-skip-backward", "media-skip-forward", "media-step-backward", "media-step-forward", "media-stop", "medical-cross", "menu", "microphone", "minus", "monitor", "moon", "move", "musical-note", "paperclip", "pencil", "people", "person", "phone", "pie-chart", "pin", "play-circle", "plus", "power-standby", "print", "project", "pulse", "puzzle-piece", "question-mark", "rain", "random", "reload", "resize-both", "resize-height", "resize-width", "rss", "rss-alt", "script", "share", "share-boxed", "shield", "signal", "signpost", "sort-ascending", "sort-descending", "spreadsheet", "star", "sun", "tablet", "tag", "tags", "target", "task", "terminal", "text", "thumb-down", "thumb-up", "timer", "transfer", "trash", "underline", "vertical-align-bottom", "vertical-align-center", "vertical-align-top", "video", "volume-high", "volume-low", "volume-off", "warning", "wifi", "wrench", "x", "yen", "zoom-in", "zoom-out"];