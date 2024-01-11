/**
 * @param {unknown} err
 * @return {Error}
 */
export function coalesce_to_error(err: unknown): Error;
/**
 * This is an identity function that exists to make TypeScript less
 * paranoid about people throwing things that aren't errors, which
 * frankly is not something we should care about
 * @param {unknown} error
 */
export function normalize_error(error: unknown): Error | HttpError | import("../runtime/control.js").Redirect | SvelteKitError;
/**
 * @param {unknown} error
 */
export function get_status(error: unknown): number;
/**
 * @param {unknown} error
 */
export function get_message(error: unknown): string;
import { HttpError } from '../runtime/control.js';
import { SvelteKitError } from '../runtime/control.js';
//# sourceMappingURL=error.d.ts.map