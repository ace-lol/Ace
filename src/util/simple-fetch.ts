"use strict";

export default function simple_fetch(url: string, cb: (contents: string, req: XMLHttpRequest) => void) {
    const req = new XMLHttpRequest();
    req.addEventListener('load', () => cb(req.responseText, req));
    req.open("get", url, true);
    req.send();
}