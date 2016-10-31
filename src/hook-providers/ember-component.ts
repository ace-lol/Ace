"use strict";

import { wrap_method } from "../util";
import Ace from "../ace";
import Promise = require("bluebird");

export const NAME = "ember-component";

type Callback = (args: any[]) => any;
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
    // At the time of writing, 1.12.1 is also present in the LCU.
    // Since only the patcher uses it, and it warns about deprecation,
    // I opted not to include it in the hook.
    ace.getBuiltinApi("rcp-fe-ember-libs").then(api => Promise.all([
        api.getEmber("2.2.0"),
        api.getEmber("2.4.5")
    ])).then(embers => {
        embers.forEach(Ember => {
            wrap_method(Ember.Component, "extend", function(original, args) {
                // Find the classNames component, in case there were mixins present.
                const name = (<any[]>args).filter(x => (typeof x === "object") && x.classNames).map(x => x.classNames.join(" "));
                let res = original(...args);

                if (name.length) {
                    HOOKS.filter(x => x.matcher === name[0]).forEach(hook => {
                        const hookResult = hook.fun(args);
                        if (hookResult) {
                            res = res.extend(hookResult);
                        }
                    });
                }

                return res;
            });
        });
    });
}