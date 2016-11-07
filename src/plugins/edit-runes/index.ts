"use strict";

import { PluginDescription } from "../../plugin";
import Ace from "../../ace";

import "./style";

export default (<PluginDescription>{
    name: "edit-runes",
    version: "0.1.0",
    description: "Allows you to edit runes in champion select.",
    builtinDependencies: {
        "rcp-fe-lol-champ-select": "1.0.x",
        "rcp-fe-lol-runes": "0.0.x",
        "rcp-fe-lol-uikit": "*"
    },
    setup() {
        let uikit: any;
        this.postinit("rcp-fe-lol-uikit", p => {
            uikit = p.api;
        });

        this.preinit("rcp-fe-lol-champ-select", () => {
            let unregister = this.hook("ember-component", Ember => {
                unregister();
                return Mixin(Ember, uikit, this.ace);
            }, "champion-select");
        });
    }
});

const Mixin = (Ember: any, uikit: any, ace: Ace) => ({
    didInsertElement() {
        this._super();

        const runeApi = ace.getBuiltinPluginWithName("rcp-fe-lol-runes")!.api;

        // Creates a simple overlay with a lol-uikit-full-page-modal child.
        const createOverlay = (contents: any) => {
            const outer = document.createElement("div");
            outer.className = "runes-modal";
            const inner = document.createElement("lol-uikit-full-page-modal");
            inner.setAttribute("cover-sidebar", "");
            outer.appendChild(inner);
            inner.appendChild(contents);
            return outer;
        };

        const onOpenClick = () => {
            // First, get the runebook interface.
            runeApi.getMyRunebook().then((runeInst: any) => {
                // Create the overlay and show it.
                const overlay = createOverlay(runeInst.domNode);
                uikit.getLayerManager().addLayer(overlay);

                // Listen for when the user presses on the button.
                overlay.addEventListener("close-modal", () => {
                    uikit.getLayerManager().removeLayer(overlay);
                    runeApi.willHide(() => {}); // Check if there are pending changes.
                });
            });
        };
        
        // After the initial render, add our edit runes button.
        // We could technically change the layout, but that requires
        // a lot more effort than some simple DOM editing.
        // TODO(molenzwiebel): Styling
        Ember.run.scheduleOnce('afterRender', this, function() {
            const controlDom = this.$(".champion-config-container")[0];
            const btn = document.createElement("button");
            btn.textContent = "Edit Runes";
            btn.onclick = onOpenClick;
            controlDom.appendChild(btn);
        });
    }
});