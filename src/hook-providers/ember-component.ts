"use strict";

import { wrap_method } from "../util";
import Ace from "../ace";

export const NAME = "ember-component";
const HOOKED = Symbol("ace-ember-component-hooked");

type Callback = (Ember: any, args: any[]) => any;
const HOOKS: { matcher: string, fun: Callback }[] = [];

// TODO(molenzwiebel): Is there a better matching mechanism than class names?
// They seem to be present on most (if not all) components someone would want to
// hook.

/**
 * Registers a new hook for the specified class name that gets called when an
 * Ember component with the specified name gets created. If the function returns
 * any results, the component is `extend`ed with said properties, effectively
 * changing the result.
 */
export function register(fun: Callback, matcher: string) {
    const obj = { matcher, fun };
    HOOKS.push(obj);
    return () => {
        HOOKS.splice(HOOKS.indexOf(obj), 1);
    };
}

/**
 * Initializes this hook provider by wrapping the various instances of `Ember.Component.extend`.
 */
export function initialize(ace: Ace) {
    ace.getBuiltinApi("rcp-fe-ember-libs").then(api => {
        // We need to do a little dance here to make sure we hook before the first invocation.
        // Since rcp-fe-ember-libs is async, we cannot guarantee that we are the first to receive
        // the Ember instance if we simply hook the result of api.getEmber. Instead, we need to
        // make sure we modify the Ember instance before we return it to the plugin requesting it.
        wrap_method(api, "getEmber", function(original, args) {
            const res: Promise<any> = original(...args);

            return res.then(Ember => {
                // No point in hooking twice.
                if (Ember[HOOKED]) return Ember;

                Ember[HOOKED] = true;
                hookEmber(Ember);
                return Ember;
            });
        });
    });
}

function hookEmber(Ember: any) {
    wrap_method(Ember.Component, "extend", function(original, args) {
        // Find the classNames component, in case there were mixins present.
        const name = (<any[]>args).filter(x => (typeof x === "object") && x.classNames && Array.isArray(x.classNames)).map(x => x.classNames.join(" "));
        let res = original(...args);

        if (name.length) {
            HOOKS.filter(x => x.matcher === name[0]).forEach(hook => {
                const hookResult = hook.fun(Ember, args);
                if (hookResult) {
                    res = res.extend(hookResult);
                }
            });
        }

        return res;
    });
}