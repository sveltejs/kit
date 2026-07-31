declare global {
	namespace App {
		interface Locals {
			answer: number;
			name?: string;
			key: string | null;
			params: Record<string, any>;
			url?: URL;
			message?: string;
			written_in_handle?: string;
		}

		interface PageState {
			active?: boolean;
			count?: number;
		}
	}

	interface Window {
		shallow_navigation_log: Array<{
			hook: string;
			params?: Record<string, unknown> | null;
			path?: string;
			route?: string | null;
			state?: string | null;
			type?: string;
			shallow?: boolean;
		}>;
	}
}

export {};
