"use strict";

import { PluginDescription } from "../../plugin";
import Promise = require("bluebird");

import RootComponent from "./root-component";

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
            button.onclick = presentSettings(uikit);

            appControls.insertBefore(button, appControls.firstChild);
        });
    }
});

const presentSettings = (uikit: any) => () => {
    const parent = document.createElement("div");
    
    const el = document.createElement("el");
    parent.appendChild(el);

    const modal = { domNode: parent };
    uikit.getModalManager().add(modal);

    parent.addEventListener("settings-close", () => {
        uikit.getModalManager().remove(modal);
    });

    // Attach vue.
    new RootComponent({
        el
    });
};