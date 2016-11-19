"use strict";

import { PluginDescription } from "../../plugin";

import "./style";

export default (<PluginDescription>{
    name: "fancy-select",
    version: "1.0.0",
    description: "Gives champion select a different, fancier current champion layout.",
    builtinDependencies: {
        "rcp-fe-lol-champ-select": "~1.0.471"
    },
    setup() {
        this.preinit("rcp-fe-lol-champ-select", () => {
            let unregister = this.hook("ember-component", Ember => {
                unregister();
                return Mixin(Ember);
            }, "player-object-medium");
        });
    }
});

const Mixin = (Ember: any) => ({
    onChampionChange: Ember.observer("championForIcon", function() {
        Ember.run.scheduleOnce('afterRender', this, function() {
            const id = this.get("championForIcon.id");
            const el = this.$(".video-magic-background")[0];

            if (!id) {
                el.style.backgroundImage = null;
                return;
            }
            
            el.style.backgroundImage =
                `linear-gradient(to left, rgba(0, 0, 0, 0) 60%, rgba(0, 0, 0, 0.9) 100%), url(/lol-game-data/assets/v1/champion-splashes/${id}/${id}000.jpg)`;
        });
    })
});