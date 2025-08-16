declare global {
	namespace App {
		export interface Platform {
			context: import('@netlify/types').Context;
		}
	}
}

export {};
