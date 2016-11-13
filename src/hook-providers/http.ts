"use strict";

import { wrap_method } from "../util";

type Matcher = RegExp | string;
type Callback = (req: XMLHttpRequest, url: string, ...args: any[]) => any;

const OPTIONS = Symbol("ace-xmlhttprequest-options");
const HOOKS: { matcher: Matcher, fun: Callback }[] = [];

export const NAME = "http";

/**
 * Registers a new hook for the specified matcher which gets triggered
 * when the ready state of an XMLHttpRequest changes.
 * 
 * @param fun A function taking the XMLHttpRequest and optional extra onreadystatechange arguments.
 * @param matcher Either a regex or a string to match the url to.
 * @returns unregister A function that can be called to unregister the hook.
 */
export function register(fun: Callback, matcher: Matcher) {
    const obj = { matcher, fun };
    HOOKS.push(obj);
    return () => {
        HOOKS.splice(HOOKS.indexOf(obj), 1);
    };
}

/**
 * Initializes this hook provider by wrapping `XMLHttpRequest.open/.send`.
 */
export function initialize() {
    const proto = XMLHttpRequest.prototype;

    wrap_method(proto, "open", function(original, args) {
        // Note options.
        const [method, url, async, user, pass] = args;
        this[OPTIONS] = { method, url, async, user, pass };

        return original(...args);
    });

    wrap_method(proto, "send", function(original, args) {
        // Since wrap_method only works on existing functions, we add
        // a dummy function just in case someone is making a request and
        // not bothering what the result is.
        this.onreadystatechange = this.onreadystatechange || function(){};

        // Wrap onreadystatechange.
        wrap_method(this, "onreadystatechange", function(original, args) {
            if (!this[OPTIONS]) throw "XMLHttpRequest has no OPTIONS symbol. Something is wrong with the hook.";
            
            const url = this[OPTIONS].url;
            HOOKS.filter(h => typeof h.matcher === "string" ? h.matcher === url : url.match(h.matcher)).forEach(h => h.fun(this, url, ...args));
            return original(...args);
        });

        return original(...args);
    });
}