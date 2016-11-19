"use strict";

// These are not exhaustive, but cover what we need.
export interface ChampionMastery {
    championId: number;
    championPoints: number;
    championLevel: number;
}

export interface Skin {
    name: string;
    id: number;
    ownership: {
        owned: boolean,
        rental: { purchaseDate: number }
    };
}

export interface Champion {
    skins: Skin[];
    ownedSkins: Skin[];
    allSkins: Skin[];

    name: string;
    id: number;
}

// This class functions to have type safety in our ember component.
export abstract class SkinsEmberComponent {
    _data: Champion[];
    _mastery: ChampionMastery[];
    $: (selector: string) => any;

    abstract get(key: "sortMode"): "alphabetical" | "mastery" | "count";
    abstract get(key: "showUnowned"): boolean;
    abstract get(key: "champions"): Champion[];

    abstract set(key: "sortMode", val: "alphabetical" | "mastery" | "count"): void;
    abstract set(key: string, val: any): void;

    abstract set(key: "isLoading", val: boolean): void;
    abstract set(key: "ownedSkinCount", val: number): void;
    abstract set(key: "totalSkinCount", val: number): void;
    abstract set(key: "champions", val: Champion[]): void;
}

export interface Ember {
    Component: { extend: (key: {}) => void };
    HTMLBars: { compile: (content: string) => any };
    on: (event: string, cb: () => any) => any;
    observer: (...args: any[]) => any;
    A: <T>(arr: T[]) => T[];
    run: { next: (target: any, fn: (() => any) | string) => void };
}