"use strict";

import { simple_promise_fetch } from "../../util";
import { PluginDescription } from "../../plugin";
import Ace from "../../ace";

export default (<PluginDescription>{
    name: "easy-queue-dodge",
    version: "1.0.0",
    description: "Adds a button to champ select to dodge without closing the entire client.",
    disableByDefault: true,
    builtInDependencies: {
        "rcp-fe-lol-champ-select": "1.0.x"
    },
    setup() {
        this.preinit("rcp-fe-lol-champ-select", () => {
            let unregister = this.hook("ember-component", Ember => {
                unregister();
                return Mixin(Ember, this.ace);
            }, "champion-select");
        });
    }
});

const Mixin = (Ember: any, ace: Ace) => ({
    didInsertElement() {
        this._super();

        const onQuitClick = () => {
            simple_promise_fetch("/lol-login/v1/session/invoke?destination=gameService&method=quitGame", "POST", "args=%5B%5D").then(data => {
                simple_promise_fetch("/lol-lobby/v1/lobby", "DELETE");
            });
        }

        Ember.run.scheduleOnce('afterRender', this, function () {
            const rightButtonsDom = this.$(".bottom-right-buttons")[0];
            const oldQuitButton = this.$(".quit-button")[0];
            try {
                rightButtonsDom.removeChild(oldQuitButton);
            } catch (NotFoundError) {}

            const div = document.createElement("div");
            div.className = "quit-button";

            const button = document.createElement("lol-uikit-flat-button");
            button.textContent = "Quit";

            div.appendChild(button);
            div.onclick = onQuitClick;

            rightButtonsDom.insertBefore(div, rightButtonsDom.firstChild);
        });
    }
});