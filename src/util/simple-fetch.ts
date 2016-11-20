"use strict";

export default function simple_fetch(url: string, cb: (contents: string) => void): Promise<string> {
    return simple_promise_fetch(url).then(x => {
        cb(x);
        return x;
    });
}

export function simple_promise_fetch(url: string, method: string = "GET", body?: string): Promise<string> {
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
        req.open(method, url, true);
        req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        req.send(body);
    });
}