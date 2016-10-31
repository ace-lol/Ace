"use strict";

// These are not exhaustive, but cover what we need.
export interface ChampionMastery {
    championId: number;
    championPoints: number;
}

export interface Skin {
    name: string;
    ownership: { owned: boolean };
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

    abstract get(key: "sortMode"): "alphabetical" | "mastery" | "count";
    abstract get(key: "showUnowned"): boolean;

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
    A: <T>(arr: T[]) => T[];
}