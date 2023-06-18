import { parse_route_id } from '../../../../../packages/kit/src/utils/routing.js';

/**
 * @type {Parameters<typeof import('@sveltejs/site-kit/markdown').renderContentMarkdown>['2']['twoslashBanner']}
 */
export const kit_twoslash_banner = (filename, source, language, options) => {
	const injected = [];

	if (
		source.includes('$app/') ||
		source.includes('$service-worker') ||
		source.includes('@sveltejs/kit/')
	) {
		injected.push(`// @filename: ambient-kit.d.ts`, `/// <reference types="@sveltejs/kit" />`);
	}

	if (source.includes('$env/')) {
		// TODO we're hardcoding static env vars that are used in code examples
		// in the types, which isn't... totally ideal, but will do for now
		injected.push(
			`declare module '$env/dynamic/private' { export const env: Record<string, string> }`,
			`declare module '$env/dynamic/public' { export const env: Record<string, string> }`,
			`declare module '$env/static/private' { export const API_KEY: string }`,
			`declare module '$env/static/public' { export const PUBLIC_BASE_URL: string }`
		);
	}

	if (source.includes('./$types') && !source.includes('@filename: $types.d.ts')) {
		const params = parse_route_id(options.file || `+page.${language}`)
			.params.map((param) => `${param.name}: string`)
			.join(', ');

		console.log(options);

		injected.push(
			`// @filename: $types.d.ts`,
			`import type * as Kit from '@sveltejs/kit';`,
			`export type PageLoad = Kit.Load<{${params}}>;`,
			`export type PageServerLoad = Kit.ServerLoad<{${params}}>;`,
			`export type LayoutLoad = Kit.Load<{${params}}>;`,
			`export type LayoutServerLoad = Kit.ServerLoad<{${params}}>;`,
			`export type RequestHandler = Kit.RequestHandler<{${params}}>;`,
			`export type Action = Kit.Action<{${params}}>;`,
			`export type Actions = Kit.Actions<{${params}}>;`,
			`export type EntryGenerator = () => Promise<Array<{${params}}>> | Array<{${params}}>;`
		);
	}

	// special case — we need to make allowances for code snippets coming
	// from e.g. ambient.d.ts
	if (filename.endsWith('30-modules.md')) {
		injected.push('// @errors: 7006 7031');
	}

	if (filename.endsWith('10-configuration.md')) {
		injected.push('// @errors: 2307');
	}

	// another special case
	if (source.includes('$lib/types')) {
		injected.push(`declare module '$lib/types' { export interface User {} }`);
	}

	return injected.join('\n');
};
