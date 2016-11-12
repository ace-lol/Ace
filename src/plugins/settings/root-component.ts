"use strict";

import Component from "../../util/component-decorator";
import Vue = require("vue/dist/vue.js");

import LAYOUT = require("./layout.html");
import "./style";

@Component({
    template: LAYOUT
})
export default class RootComponent extends Vue {
    close() {
        this.$el.dispatchEvent(new Event("settings-close", { bubbles: true }));
    }
}