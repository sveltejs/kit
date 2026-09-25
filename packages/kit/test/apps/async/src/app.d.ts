declare global {
	interface Window {
		__recomputations: number;
		fork_store_subscribers: number;
		held_navigations: Array<() => void>;
	}
}

export {};
