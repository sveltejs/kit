declare global {
	namespace App {
		interface Locals {
			answer: number;
			name?: string;
			key: string;
			params: Record<string, string>;
			url?: URL;
			message?: string;
		}

		interface PageState {
			active?: boolean;
			count?: number;
		}
	}
}

export {};
