declare global {
	namespace App {
		interface Locals {
			answer: number;
			name?: string;
			key: string;
			params: Record<string, string>;
			url?: URL;
		}

		interface PageState {
			active: boolean;
		}

		interface Platform {}
	}
}

export {};
