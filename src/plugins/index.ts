"use strict";

import Ace from "../ace";
import Plugin, { PluginDescription } from "../plugin";

const PLUGINS: PluginDescription[] = [{
    name: "hello-world",
    version: "0.1.0",
    description: "Hello, world!",
    setup() {
        console.debug("Initialized " + this);
        return "Hello, world!";
    }
}];

export default function register(ace: Ace) {
    PLUGINS.forEach(des => {
        const inst = new Plugin(ace, des);
        ace.registerPlugin(inst);
    });
}