"use strict";

import Vue = require("vue/dist/vue.js");
import Component from "../../../util/component-decorator";
import SettingsAPI from "../../settings/api";

import LAYOUT = require("./layout.html");
import "./style";

/**
 * Represents a group of champions that can be sorted upon.
 */
interface Group {
    name: string;
}

/**
 * Wrapped in a closure so we get access to the settings api.
 */
export default function(settings: SettingsAPI) {
    // Create default structure if it doesn't exist.
    if (!settings.settings.championGroups) {
        // this merges.
        settings.settings = {
            championGroups: []
        };
    }

    @Component({
        template: LAYOUT
    })
    class ChampionGroupsConfigPanel extends Vue {
        groups: Group[];

        data() {
            return {
                groups: settings.settings.championGroups.groups
            };
        }

        beforeDestroy() {
            settings.save();
        }
    };

    return ChampionGroupsConfigPanel;
}