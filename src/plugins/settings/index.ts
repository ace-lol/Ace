"use strict";

import { PluginDescription } from "../../plugin";
import Vue = require("vue/dist/vue.min.js");

import RootComponent from "./components/root/root-component";
import API from "./api";
import "./style";

export default (<PluginDescription>{
    name: "settings",
    version: "1.1.0",
    description: "Adds settings and plugin management for Ace plugins.",
    builtinDependencies: {
        "rcp-fe-app-controls": "~0.0.384",
        "rcp-fe-lol-uikit": "~0.3.194"
    },
    setup() {
        const api = new API();

        Promise.all([
            this.getBuiltinApi("rcp-fe-lol-uikit"),
            this.getBuiltinApi("rcp-fe-app-controls")
        ]).then(([uikit]) => {
            const appControls = document.querySelector(".riotclient-app-controls")!;

            const button = document.createElement("div");
            button.className = "app-controls-button app-controls-ace-settings";
            button.setAttribute("action", "_getDialogHeader"); // dummy method to not throw an error
            button.onclick = presentSettings(uikit, this.ace, api);

            appControls.insertBefore(button, appControls.firstChild);
        });

        return api.load().then(() => api);
    }
});

const presentSettings = (uikit: any, ace: any, api: any) => () => {
    const parent = document.createElement("lol-uikit-full-page-backdrop");
    parent.className = "ace-settings-dialog";
    
    const el = document.createElement("div");
    parent.appendChild(el);

    // Close chat if it is open, since it will be above our settings.
    const chatWindow: any | null = document.querySelector("body /deep/ lol-social-chat-window");
    chatWindow && chatWindow.closeImmediately && chatWindow.closeImmediately();

    const layerManager = document.getElementById("lol-uikit-layer-manager");
    document.body.insertBefore(parent, layerManager);

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

    // Add vue instance.
    const vueInstance = new RootComponent({
        el,
        data: {
            ace, api
        }
    });

    parent.addEventListener("settings-close", () => {
        // Destroy vue
        vueInstance.$destroy();
        document.body.removeChild(parent);
    });
};