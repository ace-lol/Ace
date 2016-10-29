declare module "toposort" {
    function toposort<T>(dependencies: [T, T][]): T[];
    export = toposort;
}