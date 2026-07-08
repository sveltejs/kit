import type { PrerenderOption, TrailingSlash } from 'types';
import type { valid_page_options_array } from './index.js';

type ValidPageOption = (typeof valid_page_options_array)[number];

export type PageOptions = Partial<{
	[K in ValidPageOption]: K extends 'ssr' | 'csr'
		? boolean
		: K extends 'prerender'
			? PrerenderOption
			: K extends 'trailingSlash'
				? TrailingSlash
				: any;
}>;
