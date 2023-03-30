import { RequestContext } from './index.js';

declare global {
	namespace App {
		export interface Platform {
			/**
			 * `context` is only available in Edge Functions
			 */
			context?: RequestContext;
		}
	}
}
