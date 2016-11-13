/**
 * Vue already has built-in typescript typings, but we need the build with the compiler.
 * We simply notify typescript here that vue/dist/vue.js exports the same things as the normal vue import.
 */
declare module "vue/dist/vue.js" {
    import Vue = require("vue");
    export = Vue;
}