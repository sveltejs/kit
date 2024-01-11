/**
 * Throws an error with a HTTP status code and an optional message.
 * When called during request handling, this will cause SvelteKit to
 * return an error response without invoking `handleError`.
 * Make sure you're not catching the thrown error, which would prevent SvelteKit from handling it.
 * @param {NumericRange<400, 599>} status The [HTTP status code](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#client_error_responses). Must be in the range 400-599.
 * @param {App.Error} body An object that conforms to the App.Error type. If a string is passed, it will be used as the message property.
 * @overload
 * @param {NumericRange<400, 599>} status
 * @param {App.Error} body
 * @return {never}
 * @throws {HttpError} This error instructs SvelteKit to initiate HTTP error handling.
 * @throws {Error} If the provided status is invalid (not between 400 and 599).
 */
export function error(status: NumericRange<400, 599>, body: App.Error): never;
/**
 * Throws an error with a HTTP status code and an optional message.
 * When called during request handling, this will cause SvelteKit to
 * return an error response without invoking `handleError`.
 * Make sure you're not catching the thrown error, which would prevent SvelteKit from handling it.
 * @param {NumericRange<400, 599>} status The [HTTP status code](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#client_error_responses). Must be in the range 400-599.
 * @param {{ message: string } extends App.Error ? App.Error | string | undefined : never} [body] An object that conforms to the App.Error type. If a string is passed, it will be used as the message property.
 * @overload
 * @param {NumericRange<400, 599>} status
 * @param {{ message: string } extends App.Error ? App.Error | string | undefined : never} [body]
 * @return {never}
 * @throws {HttpError} This error instructs SvelteKit to initiate HTTP error handling.
 * @throws {Error} If the provided status is invalid (not between 400 and 599).
 */
export function error(status: NumericRange<400, 599>, body?: {
    message: string;
} extends App.Error ? App.Error | string | undefined : never): never;
/**
 * Checks whether this is an error thrown by {@link error}.
 * @template {number} T
 * @param {unknown} e
 * @param {T} [status] The status to filter for.
 * @return {e is (HttpError & { status: T extends undefined ? never : T })}
 */
export function isHttpError<T extends number>(e: unknown, status?: T | undefined): e is HttpError & {
    status: T extends undefined ? never : T;
};
/**
 * Redirect a request. When called during request handling, SvelteKit will return a redirect response.
 * Make sure you're not catching the thrown redirect, which would prevent SvelteKit from handling it.
 * @param {NumericRange<300, 308>} status The [HTTP status code](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#redirection_messages). Must be in the range 300-308.
 * @param {string | URL} location The location to redirect to.
 * @throws {Redirect} This error instructs SvelteKit to redirect to the specified location.
 * @throws {Error} If the provided status is invalid.
 * @return {never}
 */
export function redirect(status: NumericRange<300, 308>, location: string | URL): never;
/**
 * Checks whether this is a redirect thrown by {@link redirect}.
 * @param {unknown} e The object to check.
 * @return {e is Redirect}
 */
export function isRedirect(e: unknown): e is Redirect;
/**
 * Create a JSON `Response` object from the supplied data.
 * @param {any} data The value that will be serialized as JSON.
 * @param {ResponseInit} [init] Options such as `status` and `headers` that will be added to the response. `Content-Type: application/json` and `Content-Length` headers will be added automatically.
 */
export function json(data: any, init?: ResponseInit | undefined): Response;
/**
 * Create a `Response` object from the supplied body.
 * @param {string} body The value that will be used as-is.
 * @param {ResponseInit} [init] Options such as `status` and `headers` that will be added to the response. A `Content-Length` header will be added automatically.
 */
export function text(body: string, init?: ResponseInit | undefined): Response;
/**
 * Create an `ActionFailure` object.
 * @param {number} status The [HTTP status code](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#client_error_responses). Must be in the range 400-599.
 * @overload
 * @param {number} status
 * @returns {import('./public.js').ActionFailure<undefined>}
 */
export function fail(status: number): import('./public.js').ActionFailure<undefined>;
/**
 * Create an `ActionFailure` object.
 * @template {Record<string, unknown> | undefined} [T=undefined]
 * @param {number} status The [HTTP status code](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#client_error_responses). Must be in the range 400-599.
 * @param {T} data Data associated with the failure (e.g. validation errors)
 * @overload
 * @param {number} status
 * @param {T} data
 * @returns {import('./public.js').ActionFailure<T>}
 */
export function fail<T extends Record<string, unknown> | undefined = undefined>(status: number, data: T): import("./public.js").ActionFailure<T>;
export { VERSION } from "../version.js";
export type LessThan<TNumber extends number, TArray extends any[] = []> = TNumber extends TArray['length'] ? TArray[number] : LessThan<TNumber, [...TArray, TArray['length']]>;
export type NumericRange<TStart extends number, TEnd extends number> = Exclude<TEnd | LessThan<TEnd>, LessThan<TStart>>;
import { HttpError } from '../runtime/control.js';
import { Redirect } from '../runtime/control.js';
//# sourceMappingURL=index.d.ts.map