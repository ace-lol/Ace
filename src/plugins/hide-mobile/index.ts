"use strict";

import { PluginDescription } from "../../plugin";
import { RegisterElementParams } from "../../hook-providers/register-element";
import { wrap_method } from "../../util";

import replacementHTML = require("./checkboxes.html");

export default (<PluginDescription>{
    name: "hide-mobile",
    version: "0.1.0",
    description: "Adds a new 'Hide Mobile' option to hide friends that are on the LoL Friends app, but not online.",
    builtinDependencies: {
        "rcp-fe-lol-social": ">=1.0.653-hotfix01 || 1.0.x"
    },
    setup() {
        let unregisterContent: () => void;
        let unregisterElement: () => void = () => {}; // Initialization needed to keep TypeScript happy.

        this.preinit("rcp-fe-lol-social", () => {
            unregisterElement = this.hook("register-element", (args: RegisterElementParams) => {

                // We wrap the `friendFilter` to also filter mobile players.
                wrap_method(args.prototype, "friendFilter", function(original: any, [n]: [any]) {
                    const shouldHideOffline = this.data.playerSettings.hideOffline;
                    const shouldHideMobile = this.data.playerSettings.accountSettings.data["hideMobile"];
                    return !(n.groupId !== this.group.id || shouldHideOffline && n.availability === "offline" || shouldHideMobile && n.availability === "mobile");
                });

            }, "lol-social-roster-group");

            unregisterContent = this.hook("template-content", (doc: DocumentFragment) => {
                if (doc.querySelector(".actions-bar")) {
                    // Modify the template.
                    (<HTMLElement>doc.querySelector("#options-menu > .separator")).outerHTML = replacementHTML;
                    
                    // Immediately unregister, to make sure we do not modify the same template twice.
                    // This is mainly for performance reasons, not because it would cause issues.
                    unregisterContent();
                }
            });
        });

        // Cleanup after initialization.
        this.postinit("rcp-fe-lol-social", unregisterElement);
    }
});