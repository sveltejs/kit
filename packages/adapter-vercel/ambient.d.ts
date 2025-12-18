declare global {
	namespace App {
		export interface Platform {
			/**
			 * `context` is only available in Edge Functions
			 *
			 * @deprecated Vercel's context is deprecated. Use [`@vercel/functions`](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package) instead.
			 */
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			context?: any;
		}
	}
}

export {};
