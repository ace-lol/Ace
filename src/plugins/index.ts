"use strict";

import Ace from "../ace";
import Plugin, { PluginDescription } from "../plugin";

import HideMobile from "./hide-mobile";

const PLUGINS: PluginDescription[] = [
    HideMobile
];

export default function register(ace: Ace) {
    PLUGINS.forEach(des => {
        const inst = new Plugin(ace, des);
        ace.registerPlugin(inst);
    });
}