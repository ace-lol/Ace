"use strict";

import Ace from "../ace";
import Plugin, { PluginDescription } from "../plugin";

import Settings from "./settings";
import Changelog from "./changelog";
import HideMobile from "./hide-mobile";
import NoShutdownPrompt from "./no-shutdown-prompt";
import OwnedSkins from "./owned-skins";
import SummonerIconDescription from "./summoner-icon-description";
import Resize from "./resize";
import ChampionGroups from "./champion-groups";

const PLUGINS: PluginDescription[] = [
    Settings,
    Changelog,
    HideMobile,
    NoShutdownPrompt,
    OwnedSkins,
    SummonerIconDescription,
    Resize,
    ChampionGroups
];

export default function register(ace: Ace) {
    PLUGINS.forEach(des => {
        const inst = new Plugin(ace, des);
        ace.registerPlugin(inst);
    });
}