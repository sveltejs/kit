/// <reference types="@sveltejs/kit" />

declare module 'dropcss' {
	interface Options {
		html: string;
		css: string;

		shouldDrop?: (selector: string) => boolean;
		didRetain?: (selector: string) => void;

		keepText?: boolean;
	}

	export default function dropcss(options: Options): { css: string };
}
