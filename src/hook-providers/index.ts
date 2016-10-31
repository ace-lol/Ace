"use strict";

import Ace from "../ace";

export type Callback = (...args: any[]) => any

/**
 * Represents a hooking mechanism that Ace provides
 * for plugins to use.
 */
export interface HookProvider {
    /**
     * The name of this hooking mechanism, used during registration.
     */
    NAME: string;

    /**
     * Function called during Ace initialization (before (built-in) plugins are ran).
     * This is when the hook is supposed to inject itself into the relevant functions
     * and properties.
     * 
     * There is no uninitialize property provided, since Ace does not support anything
     * like reloading plugins without reloading the page.
     */
    initialize: (instance: Ace) => void;

    /**
     * This function is called when a plugin registers a hook. Ace is responsible for checking
     * if any other plugins already registered said hook, so this method should only add
     * the hook to its own internal hook "storage".
     * 
     * Returns a function that can be called to unregister the provided callback.
     */
    register: (callback: Callback, ...params: any[]) => (() => void);
}