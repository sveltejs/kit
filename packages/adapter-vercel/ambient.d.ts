import type { waitUntil } from '@vercel/functions';

declare global {
	namespace App {
		export interface Platform {
			/**
			 * `context` is only available in Edge Functions
			 *
			 * @deprecated Vercel's context is deprecated. Use top-level properties instead.
			 */
			context?: {
				/**
				 * `context` is only available in Edge Functions
				 *
				 * @deprecated Use `event.platform.waitUntil` instead.
				 */
				waitUntil: typeof waitUntil;
			};

			/**
			 * A method that can be used to keep the function running after a response has been sent.
			 *
			 * This is useful when you have an async task that you want to keep running even after the
			 * response has been sent and the request has ended.
			 *
			 * The maximum duration depends on your plan and settings (see [here](https://vercel.com/docs/functions/limitations)).
			 *
			 * See https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package#waituntil.
			 *
			 * @example
			 *
			 * <caption>Perform a long-running task in the background without blocking the sending of the response</caption>
			 *
			 * ```ts
			 * // src/routes/+page.server.ts
			 *
			 * export const load = async (event) => {
			 *   event.platform.waitUntil(longRunningTask())
			 *
			 *   return {
			 *     // ...some data
			 *   }
			 * }
			 *
			 * async function longRunningTask() {
			 *   // ...
			 * }
			 * ```
			 */
			waitUntil: typeof waitUntil;
		}
	}
}
