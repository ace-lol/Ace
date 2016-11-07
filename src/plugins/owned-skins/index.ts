"use strict";

import { PluginDescription } from "../../plugin";
import { redefine } from "../../util";
import getComponent from "./component";

import Promise = require("bluebird");

export default (<PluginDescription>{
    name: "owned-skins",
    version: "0.1.0",
    description: "Shows your owned skins in the `Collections` tab.",
    
    builtinDependencies: {
        "rcp-fe-lol-collections": "1.0.x",
        "rcp-fe-lol-champion-details": "0.0.x",
        "rcp-fe-lol-uikit": "*"
    },

    setup() {
        // We hook the translation service to provide a title for our newly added tab.
        // We need to check for $hooked since the http hook fires for every onreadystatechange,
        // so not only when the request completes.
        this.hook("http", req => {
            if (req.$hooked) return;
            redefine<string>(req, "responseText", orig => {
                return orig().slice(0, -2) + `, "collections_sub_nav_skins": "Skins" }`;
            });
            req.$hooked = true;
        }, /\/fe\/lol-collections\/trans.json/);

        // Fetch the various APIs we need and then register the new section.
        Promise.all([
            this.getBuiltinApi("rcp-fe-lol-champion-details"),
            this.getBuiltinApi("rcp-fe-lol-collections"),
            this.getBuiltinApi("rcp-fe-lol-uikit"),
            this.getBuiltinApi("rcp-fe-ember-libs").then(api => api.getEmber("2.4.5"))
        ]).then(([championDetailApi, collectionsApi, uikitApi, Ember]) => {
            collectionsApi.registerSubSection({
                name: "skins",
                locKey: "collections_sub_nav_skins",
                componentFactoryName: "SkinsRootComponent",
                componentFactoryDef: {
                    name: "SkinsRootComponent",
                    SkinsRootComponent: getComponent(Ember, championDetailApi, uikitApi)
                },
                priority: 150
            });
        });
    }
});
