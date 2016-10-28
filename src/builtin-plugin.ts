"use strict";

export interface PluginInfo {
    app: string;
    assetBundleNames: string[];
    dependencies: { fullName: string, version: string }[];
    dynLibFileName: string;
    dynLibPath: string;
    feature: string;
    fullName: string;
    implementedContracts: { fullName: string, version: string }[];
    isDynamicLibraryInited: boolean;
    isDynamicLibraryLoaded: boolean;
    mountedAssetBundles: { [name: string]: string };
    orderDynamicLibraryInited: number;
    orderDynamicLibraryLoaded: number;
    orderWADFileMounted: number;
    pluginInfoApiSemVer: string;
    shortName: string;
    subtype: string;
    supertype: string;
    threadingModel: string;
    version: string;
}

export default class BuiltinPlugin {
    dependencies: BuiltinPlugin[];
    info: PluginInfo;

    api: any | null;
    provider: any | null;

    constructor(info: PluginInfo) {
        this.info = info;
        this.dependencies = [];

        this.api = null;
        this.provider = null;
    }
}