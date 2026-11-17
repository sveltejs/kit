import type { Plugin } from 'vite';
import './ambient.js';

export type CssVariable = `--font-${string}`;

export type FontDisplay = 'auto' | 'block' | 'swap' | 'fallback' | 'optional';

export interface LocalFontSrc {
	path: string;
	weight?: string;
	style?: 'normal' | 'italic';
	subset?: string;
}

export interface FontFamily {
	name: string;
	cssVariable: CssVariable;
	provider: 'google' | 'local';
	src?: LocalFontSrc[];
	weights?: string[];
	styles?: Array<'normal' | 'italic'>;
	subsets?: string[];
	display?: FontDisplay;
	preload?: boolean;
}

export interface EnhancedFontsOptions {
	families: FontFamily[];
	throwOnError?: boolean;
}

export type FontDataEntry = {
	src: Array<{ url: string; format: string }>;
	weight: string;
	style: string;
	subset?: string;
};

export function enhancedFonts(options?: EnhancedFontsOptions): Plugin;
export function getFontFileURL(href: string, base: string | URL): URL;
