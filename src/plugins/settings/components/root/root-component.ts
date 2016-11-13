"use strict";

import Component from "../../../../util/component-decorator";
import Vue = require("vue/dist/vue.js");

import PluginsComponent from "../plugins/plugins-component";

import LAYOUT = require("./layout.html");
import LICENSE = require("./license.txt");
import "./style";

@Component({
    template: LAYOUT,
    components: {
        plugins: PluginsComponent
    }
})
export default class RootComponent extends Vue {
    currentTab: string;

    data() {
        return {
            currentTab: "plugins",
            license: LICENSE
        };
    }

    selectTab(newTab: string) {
        this.currentTab = newTab;
    }

    close() {
        this.$el.dispatchEvent(new Event("settings-close", { bubbles: true }));
    }
}