"use strict";

import Component from "../../../../util/component-decorator";
import Vue = require("vue/dist/vue.js");

import API from "../../api";
import Ace from "../../../../ace";
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
    ace: Ace;
    api: API;
    currentTab: string;
    closeListeners: (() => PromiseLike<boolean>)[];

    data() {
        return {
            currentTab: "plugins",
            closeListeners: [],
            license: LICENSE
        };
    }

    selectTab(newTab: string) {
        this.currentTab = newTab;
    }

    addCloseListener(fn: () => PromiseLike<boolean>) {
        this.closeListeners.push(fn);
    }

    close() {
        Promise.all(this.closeListeners.map(x => x())).then(args => {
            // if every listener returned true.
            if (args.filter(y => !y).length === 0) {
                this.$el.dispatchEvent(new Event("settings-close", { bubbles: true }));
            }
        });
    }

    get aceVersion() {
        return `v${window.ACE_VERSION}`;
    }
}