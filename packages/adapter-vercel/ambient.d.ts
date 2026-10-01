import type { RequestContext } from './index.js';

declare global {
	namespace App {
		export interface Platform {
			/**
			 * `context` is only available in Edge Functions
			 *
			 * @deprecated Vercel's context is deprecated. Use [`@vercel/functions`](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package) instead.
			 */
			context?: RequestContext;
		}
	}
}
