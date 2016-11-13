"use strict";

export default function simple_fetch(url: string, cb: (contents: string) => void): Promise<string> {
    return simple_promise_fetch(url).then(x => {
        cb(x);
        return x;
    });
}

export function simple_promise_fetch(url: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const req = new XMLHttpRequest();
        req.addEventListener('load', () => {
            // resolve(req.responseText)
            if (req.readyState === 4) {
                if (req.status === 200) resolve(req.responseText);
                else reject(new Error(`simple_promise_fetch: Error, status ${req.status}`));
            }
        });
        req.addEventListener('error', err => reject(err));
        req.open("get", url, true);
        req.send();
    });
}