declare global {
	namespace App {
		export interface Platform {
			context: import('@netlify/functions').Context;
		}
	}
}

export {};
