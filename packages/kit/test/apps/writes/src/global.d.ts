declare global {
	interface Window {
		mounted: number;
	}

	var resume_load: (() => void) | undefined;
}

export {};
