"use strict";

/**
 * Utility method to redefine a property on an object.
 * Use wrap_method if you want to redefine a function instead.
 * 
 * The provided functions have their `this` instance set to the current object.
 * Remember this when passing arrow functions, since they retain their this value.
 */
export default function redefine<T>(container: any, name: string, getter: (original: () => T) => T, setter?: (v: T, original: (newValue: T) => void) => void) {
    const originalGetter = Object.getOwnPropertyDescriptor(container, name).get;
    const originalSetter = Object.getOwnPropertyDescriptor(container, name).set;

    const newOptions: PropertyDescriptor = {
        get() {
            // We wrap the originalGetter to make sure the `this` context is always correct.
            return getter.call(this, () => originalGetter!.call(this));
        },

        // We might want to override this value later, so make it writable.
        configurable: true
    };

    if (setter) {
        newOptions.set = function(newValue) {
            // We wrap originalSetter to make sure the `this` context is always correct.
            setter.call(this, newValue, (val: T) => originalSetter!.call(this, val));
        };
    }

    Object.defineProperty(container, name, newOptions);
}