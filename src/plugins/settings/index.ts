"use strict";

import { PluginDescription } from "../../plugin";
import Promise = require("bluebird");
import Vue = require("vue/dist/vue.js");

import RootComponent from "./components/root/root-component";

export default (<PluginDescription>{
    name: "settings",
    version: "0.1.0",
    description: "Adds settings and plugin management for Ace plugins.",
    builtinDependencies: {
        "rcp-fe-app-controls": "0.0.x",
        "rcp-fe-lol-uikit": "*"
    },
    setup() {
        Promise.all([
            this.getBuiltinApi("rcp-fe-lol-uikit"),
            this.getBuiltinApi("rcp-fe-app-controls")
        ]).then(([uikit]) => {
            const appControls = document.querySelector(".riotclient-app-controls");

            const button = document.createElement("div");
            button.className = "app-controls-button app-controls-cryo-settings";
            button.textContent = "C"; // TODO
            button.onclick = presentSettings(uikit, this.ace);

            appControls.insertBefore(button, appControls.firstChild);
        });
    }
});

const presentSettings = (uikit: any, ace: any) => () => {
    const parent = document.createElement("div");
    
    const el = document.createElement("el");
    parent.appendChild(el);

    const modal = { domNode: parent };
    uikit.getModalManager().add(modal);

    parent.addEventListener("settings-close", () => {
        uikit.getModalManager().remove(modal);
    });

    // Adding a v-uikit-tooltip="'Text here'" attribute to any element will
    // add a simple tooltip that displays the text when the user hovers over it.
    Vue.directive("uikit-tooltip", function(el, binding) {
        // Remove the old tooltip if applicable.
        uikit.getTooltipManager().unassign(el);

        // If there is no tooltip, don't attach.
        if (!binding.value) return;

        const render = () => {
            const el = document.createElement("lol-uikit-tooltip");
            el.appendChild(uikit.getTemplateHelper().contentBlockTooltip(undefined, binding.value, "tooltip-system"));
            return el;
        };

        // Display it above, centered.
        // Uikit will mirror it if it doesn't fit.
        uikit.getTooltipManager().assign(el, render, {}, {
            targetAnchor: {
                x: "center",
                y: "top"
            },
            tooltipAnchor: {
                x: "center",
                y: "bottom"
            }
        });
    });

    // Attach vue.
    new RootComponent({
        el,
        data: {
            ace
        }
    });
};