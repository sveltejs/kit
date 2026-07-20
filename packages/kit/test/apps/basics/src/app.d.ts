declare global {
	namespace App {
		interface Locals {
			answer: number;
			name?: string;
			key: string | null;
			params: Record<string, any>;
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
