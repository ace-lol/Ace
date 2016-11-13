/**
 * This makes sure that TypeScript knows requiring html files returns raw strings.
 */
declare module "*.html" {
    const contents: string;
    export = contents;
}

/**
 * Ditto for handlebars.
 */
declare module "*.hbs" {
    const contents: string;
    export = contents;
}

/**
 * Ditto for text files.
 */
declare module "*.txt" {
    const contents: string;
    export = contents;
}

/**
 * JSON files export any object.
 */
declare module "*.json" {
    const contents: any;
    export = contents;
}