"use strict";

import { PluginDescription } from "../../plugin";
import SettingsAPI from "../settings/api";
import semver = require("semver");

import "./welcome/style";
import WELCOME_HTML = require("./welcome/index.html");

interface ChangelogSettings {
    didShowWelcome: boolean | null;
    previousVersion: string | null;
}

export default (<PluginDescription>{
    name: "changelog",
    version: "0.1.0",
    description: "Displays Ace changelogs and the initial welcome message.",
    builtinDependencies: {
        "rcp-fe-lol-uikit": "*"
    },
    dependencies: {
        "settings": "0.1.x"
    },
    setup() {
        const settings: SettingsAPI = this.getPlugin("settings").api;

        const state = settings.get<ChangelogSettings>("changelog", {
            didShowWelcome: false,
            previousVersion: window.ACE_VERSION
        });

        // We need lol-uikit to show a full page modal. 
        this.getBuiltinApi("rcp-fe-lol-uikit").then(uikit => {
            if (!state.didShowWelcome) {
                showFullpageBackdrop(uikit, WELCOME_HTML).then(() => {
                    state.didShowWelcome = true;
                    settings.mergeSettings({ changelog: state });
                    settings.save();    
                });
            }
        });
    }
});

/**
 * Shows a full-page backdrop with the provided html as contents.
 * The returned promise resolves when the user closes the UI.
 * Every element with a 'closes' attribute will get an click event
 * listener attached, that closes the overlay when pressed.
 */
function showFullpageBackdrop(uikit: any, html: string): Promise<void> {
    return new Promise<void>(resolve => {
        const parent = document.createElement("lol-uikit-full-page-backdrop");
        parent.style.display = "flex";
        parent.style.justifyContent = "center";
        parent.style.alignItems = "center"; 
    
        const el = document.createElement("div");
        el.innerHTML = html;
        Array.prototype.forEach.call(el.querySelectorAll("*[closes]"), (el: Element) => {
            el.addEventListener("click", () => {
                uikit.getLayerManager().removeLayer(parent);
                resolve();
            });
        });

        parent.appendChild(el);
        uikit.getLayerManager().addLayer(parent);
    });
}