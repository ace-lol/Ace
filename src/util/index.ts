"use strict";

export { default as simple_fetch, simple_promise_fetch } from "./simple-fetch";
export { default as wrap_method } from "./wrap-method";
export { default as redefine } from "./redefine";

export function throw_expr(expr: any): never {
    throw expr;
}