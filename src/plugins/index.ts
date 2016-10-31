"use strict";

import Ace from "../ace";
import Plugin, { PluginDescription } from "../plugin";

import HideMobile from "./hide-mobile";
import NoShutdownPrompt from "./no-shutdown-prompt";
import OwnedSkins from "./owned-skins";

const PLUGINS: PluginDescription[] = [
    HideMobile,
    NoShutdownPrompt,
    OwnedSkins
];

export default function register(ace: Ace) {
    PLUGINS.forEach(des => {
        const inst = new Plugin(ace, des);
        ace.registerPlugin(inst);
    });
}