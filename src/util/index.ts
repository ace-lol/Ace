"use strict";

export { default as simple_fetch } from "./simple-fetch";
export { default as wrap_method } from "./wrap-method";

export function throw_expr(expr: any): never {
    throw expr;
}