"use strict";

import { HookProvider, Callback } from "./hook-providers";
import Plugin from "./plugin";

interface HookArguments {
    owner: Plugin;
    args: any[];
};

export default class HookManager {
    hookProviders: { [name: string]: HookProvider };
    hookArguments: { [name: string]: HookArguments[] };

    constructor() {
        this.hookProviders = {};
        this.hookArguments = {};
    }

    /**
     * Adds a new hook for the specified HookProvider name.
     * Warns if another plugin also has a hook for the same matchers.
     */
    hook(plugin: Plugin, hookName: string, callback: Callback, ...matchers: any[]) {
        if (!this.hookProviders[hookName]) throw `Unknown HookProvider: ${hookName}`;

        const hookProvider = this.hookProviders[hookName];

        // Check for existing hooks. This is not needed if there are no
        // applicable filters for the specified HookProvider.
        if (matchers.length !== 0) {
            this.hookArguments[hookName].forEach(arg => {
                if (this.areParamsEqual(matchers, arg.args)) {
                    console.warn("=============================== WARNING =====================================");
                    console.warn(`Both \`${plugin.name}\` and \`${arg.owner.name}\` try to hook for ${JSON.stringify(matchers)} on ${hookName}.`);
                    console.warn("This may cause issues where the latter hook will run into unexpected changes.");
                    console.warn("Verify that both plugins do not interfere with each other during their hooks.");
                    console.warn("=============================================================================");
                }
            });
        }

        this.hookArguments[hookName].push({ owner: plugin, args: matchers });
        hookProvider.register(callback, ...matchers);
    }

    /**
     * Registers *and initializes* the specified HookProvider. Throws
     * if there is already a HookProvider with that name registered.
     */
    registerHookProvider(prov: HookProvider) {
        if (this.hookProviders[prov.NAME]) throw `HookProvider ${prov.NAME} is already registered.`;
        this.hookProviders[prov.NAME] = prov;
        this.hookArguments[prov.NAME] = [];
        prov.initialize();
    }

    private areParamsEqual(a: any[], b: any[]): boolean {
        console.dir(a);
        console.dir(b);
        if (a.length !== b.length) throw `HookProvider register call parameter length is not consistent. This should never happen.`;

        for (let i = 0; i < a.length; i++) {
            // TODO(molenzwiebel): This fails equality checks for regexes and other "complex" objects.
            if (typeof a[i] !== typeof b[i] || a[i] !== b[i]) return false;
        }

        return true;
    }
}