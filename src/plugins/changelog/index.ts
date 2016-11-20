"use strict";

import { PluginDescription } from "../../plugin";
import { simple_promise_fetch } from "../../util";
import SettingsAPI from "../settings/api";
import semver = require("semver");
import marked = require("marked");

import "./welcome/style";
import WELCOME_HTML = require("./welcome/index.html");

import "./changelog/style";
import CHANGELOG_HTML = require("./changelog/index.html");

interface ChangelogSettings {
    didShowWelcome: boolean;
    previousVersion: string;
}

export default (<PluginDescription>{
    name: "changelog",
    version: "1.0.0",
    description: "Displays Ace changelogs and the initial welcome message.",
    builtinDependencies: {
        "rcp-fe-lol-uikit": "~0.3.194"
    },
    dependencies: {
        "settings": "^1.0.0"
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
                return;
            }

            // If we updated, show the changelog and update the previousVersion prop.
            if (semver.gt(window.ACE_VERSION, state.previousVersion)) {
                state.previousVersion = window.ACE_VERSION;
                settings.mergeSettings({ changelog: state });
                settings.save(); 

                // Fetch changelog.
                simple_promise_fetch("https://api.github.com/repos/ace-lol/ace/releases").then(json => {
                    const data: any[] = JSON.parse(json);
                    const release: { body: string } = data.filter(x => x.tag_name === window.ACE_VERSION)[0];
                    return release.body;
                }).then(markdownBody => {
                    const customRenderer = new marked.Renderer();
                    customRenderer.link = (href, title, contents) => `<a href="${href}" target="blank">${contents}</a>`;

                    showFullpageBackdrop(
                        uikit,
                        CHANGELOG_HTML
                            .replace("CHANGELOG", marked(markdownBody, { renderer: customRenderer }))
                            .replace("VERSION", window.ACE_VERSION)
                    );
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