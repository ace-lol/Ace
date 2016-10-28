"use strict";

import { wrap_method } from "../util";

type Matcher = RegExp | string;
type Callback = (req: XMLHttpRequest, ...args: any[]) => any;

const OPTIONS = (<any>window).Symbol("ace-xmlhttprequest-options");
const HOOKS: { matcher: Matcher, fun: Callback }[] = [];

export const NAME = "http";

/**
 * Registers a new hook for the specified matcher which gets triggered
 * when the ready state of an XMLHttpRequest changes.
 * 
 * @param matcher Either a regex or a string to match the url to.
 * @param callback A function taking the XMLHttpRequest and optional extra onreadystatechange arguments.
 */
export function register(fun: Callback, matcher: Matcher) {
    HOOKS.push({ matcher, fun });
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
            HOOKS.filter(h => typeof h.matcher === "string" ? h.matcher === url : url.match(h.matcher)).forEach(h => h.fun(this, ...args));
            return original(...args);
        });

        return original(...args);
    });
}