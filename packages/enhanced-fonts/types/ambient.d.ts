declare module 'virtual:enhanced-fonts' {
	export type FontPreload = { href: string; type: string; subset?: string };
	export type FontComponentData = {
		css: string;
		preloads: FontPreload[];
		data: Array<{
			src: Array<{ url: string; format: string }>;
			weight: string;
			style: string;
			subset?: string;
		}>;
	};

	export const registry: Record<string, FontComponentData>;
	export const fontData: Record<string, FontComponentData['data']>;
	export function get_font(cssVariable: string): FontComponentData;
	export function get_font_data(cssVariable: string): FontComponentData['data'];
}
