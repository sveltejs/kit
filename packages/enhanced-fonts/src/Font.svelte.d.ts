import type { Component } from 'svelte';
import type { CssVariable } from '../types/index.js';

export interface FontProps {
	cssVariable: CssVariable;
	preload?: boolean;
}

declare const Font: Component<FontProps>;
export default Font;
