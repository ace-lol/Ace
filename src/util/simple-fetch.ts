"use strict";

import Promise = require("bluebird");

export default function simple_fetch(url: string, cb: (contents: string, req: XMLHttpRequest) => void) {
    const req = new XMLHttpRequest();
    req.addEventListener('load', () => cb(req.responseText, req));
    req.open("get", url, true);
    req.send();
}

export function simple_promise_fetch(url: string): Promise<string> {
    return new Promise<string>(resolve => {
        simple_fetch(url, (contents, req) => resolve(contents));
    });
}