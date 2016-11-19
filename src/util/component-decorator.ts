"use strict";

/**
 * This code has been largely adapted from https://github.com/vuejs/vue-class-component/tree/master/src,
 * but changed to use Vue 2.0 and to remove some redundant options. Credit goes to Evan You.
 */
import Vue = require("vue/dist/vue.min.js");

const lifetimeHooks = [
    'data',
    'beforeCreate',
    'created',
    'beforeMount',
    'mounted',
    'beforeDestroy',
    'destroyed',
    'beforeUpdate',
    'updated',
    'activated',
    'deactivated',
    'render'
];

type VueClass = { new (): Vue } & typeof Vue;

function componentFactory(component: VueClass, options: Vue.ComponentOptions<any> = {}): VueClass {
    // Transfer properties.
    const proto = component.prototype;
    Object.getOwnPropertyNames(proto).forEach(key => {
        if (key === "constructor") return;

        // Is a lifecycle hook or otherwise important.
        if (lifetimeHooks.indexOf(key) !== -1) {
            // Simply transfer.
            (<any>options)[key] = proto[key];
            return;
        }

        const descriptor = Object.getOwnPropertyDescriptor(proto, key);
        if (typeof descriptor.value === "function") {
            // Transfer the method.
            (options.methods || (options.methods = {}))[key] = descriptor.value;
        } else if (descriptor.get || descriptor.set) {
            // Is a computed property.
            (options.computed || (options.computed = {}))[key] = {
                get: descriptor.get,
                set: descriptor.set
            };
        }
    });

    // Extend vue, either by using the parent class or by doing it manually.
    const superProto = Object.getPrototypeOf(component.prototype);
    const superclass = superProto instanceof Vue ? superProto.constructor as VueClass : Vue;
    return superclass.extend(options);
}

/**
 * Actual decorator function.
 */
export default function Component<V extends VueClass>(options: Vue.ComponentOptions<any> | V): any {
    if (typeof options === 'function') {
        return componentFactory(options);
    }

    return function(component: V) {
        return componentFactory(component, options)
    };
}