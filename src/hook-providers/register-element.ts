"use strict";

import { wrap_method } from "../util";

export const NAME = "register-element";

/**
 * Since document.registerElement is not finalized, it is not yet contained
 * in the standard definitions provided by TypeScript. This is a dummy interface
 * that describes the second argument of `document.registerElement`.
 */
export interface RegisterElementParams {
    prototype?: HTMLElement;
    extends?: string;
}

type Callback = (args: RegisterElementParams) => any;
const HOOKS: { matcher: string, fun: Callback }[] = [];

/**
 * Registers a new hook for the specified element name which gets called
 * when the prototype belonging to that element is registered.
 * 
 * The hook is able to directly modify the arguments it receives,
 * and the return value of the callback function is ignored.
 */
export function register(fun: Callback, matcher: string) {
    HOOKS.push({ matcher, fun });
}

/**
 * Initializes this hook provider by wrapping `document.registerElement`.
 */
export function initialize() {
    wrap_method(document, "registerElement", (original, [name, args]) => {
        HOOKS.filter(h => h.matcher === name).forEach(h => h.fun(args));
        return original(name, args);
    });
}