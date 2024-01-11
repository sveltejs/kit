/**
 * This is a grotesque hack that, in dev, allows us to replace the implementations
 * of these classes that you'd get by importing them from `@sveltejs/kit` with the
 * ones that are imported via Vite and loaded internally, so that instanceof
 * checks work even though SvelteKit imports this module via Vite and consumers
 * import it via Node
 * @param {{
 *   ActionFailure: typeof ActionFailure;
 *   HttpError: typeof HttpError;
 *   Redirect: typeof Redirect;
 *   SvelteKitError: typeof SvelteKitError;
 * }} implementations
 */
export function replace_implementations(implementations: {
    ActionFailure: typeof ActionFailure;
    HttpError: typeof HttpError;
    Redirect: typeof Redirect;
    SvelteKitError: typeof SvelteKitError;
}): void;
export class HttpError {
    /**
     * @param {number} status
     * @param {{message: string} extends App.Error ? (App.Error | string | undefined) : App.Error} body
     */
    constructor(status: number, body: {
        message: string;
    } extends App.Error ? (App.Error | string | undefined) : App.Error);
    status: number;
    body: App.Error;
    toString(): string;
}
export class Redirect {
    /**
     * @param {300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308} status
     * @param {string} location
     */
    constructor(status: 300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308, location: string);
    status: 301 | 302 | 303 | 307 | 308 | 300 | 304 | 305 | 306;
    location: string;
}
/**
 * An error that was thrown from within the SvelteKit runtime that is not fatal and doesn't result in a 500, such as a 404.
 * `SvelteKitError` goes through `handleError`.
 * @extends Error
 */
export class SvelteKitError extends Error {
    /**
     * @param {number} status
     * @param {string} text
     * @param {string} message
     */
    constructor(status: number, text: string, message: string);
    status: number;
    text: string;
}
/**
 * @template {Record<string, unknown> | undefined} [T=undefined]
 */
export class ActionFailure<T extends Record<string, unknown> | undefined = undefined> {
    /**
     * @param {number} status
     * @param {T} data
     */
    constructor(status: number, data: T);
    status: number;
    data: T;
}
//# sourceMappingURL=control.d.ts.map