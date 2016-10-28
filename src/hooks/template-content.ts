"use strict";

import { redefine } from "../util";

type Callback = (doc: DocumentFragment) => any;
const CALLBACKS: Callback[] = [];

// TODO(molenzwiebel): This is most definitely not the best way to edit templates,
// but it provides an easy way to make sure we are able to edit the template before
// fragments-js is able to compile it. The best alternative probably consists of
// attaching `onload` events to all imports, but that gets messy in its own way.

/**
 * Registers a new hook for which gets triggered every time the `content` option of
 * a HTMLTemplateElement is read. Try to quit the callback as early as possible, since
 * these invocations tend to happen often, especially during early initialization.
 */
export function register(fun: Callback) {
    CALLBACKS.push(fun);
}

/**
 * Initializes this hook by wrapping HTMLTemplateElement.content.
 */
export function initialize() {
    redefine<DocumentFragment>(HTMLTemplateElement.prototype, "content", function(original) {
        const result = original();
        CALLBACKS.forEach(cb => cb(result));
        return result;
    });
}