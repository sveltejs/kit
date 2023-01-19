declare global {
	namespace App {
		interface Locals {
			answer: number;
			name?: string;
			key: string;
			params: Record<string, string>;
		}

		interface Platform {}
	}
}

export {};
