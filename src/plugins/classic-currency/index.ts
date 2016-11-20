"use strict";

import { PluginDescription } from "../../plugin";

export default (<PluginDescription>{
    name: "classic-currency",
    version: "1.0.0",
    description: "Replaces the RP and IP icons with their Legacy Client equivalents.",
    builtinDependencies: {
        "rcp-fe-lol-navigation": "~0.0.193"
    },
    setup() {
        require("./style");
    }
});