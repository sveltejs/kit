declare module '__svelte-image-options__.js' {
	export const domains: string[];
	export const providers: Record<string, { getURL: import('types').GetURL }>;
	export const device_sizes: number[];
	export const image_sizes: number[];
}

declare namespace svelteHTML {
	interface HTMLAttributes<T extends EventTarget = any> {
		fetchpriority?: 'low' | 'high' | 'auto' | undefined | null;
	}
}
