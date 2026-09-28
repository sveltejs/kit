declare global {
	interface Window {
		__recomputations: number;
		fork_store_subscribers: number;
		held_navigations: Array<() => void>;
		after_navigate_log: string[];
		render_gate: Promise<string>;
		open_render_gate: (value: string) => void;
	}
}

export {};
