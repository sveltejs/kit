import http from 'node:http';

declare global {
	namespace App {
		export interface Platform {
			/**
			 * The original Node request object (https://nodejs.org/api/http.html#class-httpincomingmessage)
			 */
			req: http.IncomingMessage;
		}
	}
}
