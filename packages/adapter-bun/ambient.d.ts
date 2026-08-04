/// <reference types="bun-types" />

import type { Server } from 'bun';

declare global {
	namespace App {
		export interface Platform {
			/** The original Web API request received by `Bun.serve`. */
			request: Request;
			/** The Bun HTTP server handling the request. */
			server: Server<undefined>;
		}
	}
}
