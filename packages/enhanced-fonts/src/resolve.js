import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { render_family_css } from './css.js';
import { content_hash, slug } from './hash.js';
import { unique_by_href } from './preload.js';
import { validate_families } from './schema.js';

/** @import { FontFamily, LocalFontSrc } from '../types/index.js' */
/** @import { FontRegistry } from './runtime.js' */

/**
 * @typedef {{
 *   url: string;
 *   bytes: Buffer;
 *   weight: string;
 *   style: string;
 *   subset?: string;
 *   unicode_range?: string;
 * }} ResolvedRemoteFace
 *
 * @typedef {{
 *   file_name: string;
 *   source: Buffer;
 *   url: string;
 * }} EmittedFontFile
 *
 * @typedef {{
 *   files: EmittedFontFile[];
 *   by_css_variable: FontRegistry;
 * }} ResolvedFamilies
 *
 * @typedef {{
 *   root: string;
 *   assets_dir: string;
 *   base?: string;
 *   resolve_google?: (family: FontFamily) => Promise<ResolvedRemoteFace[]>;
 * }} ResolveContext
 */

/**
 * @param {FontFamily[]} families
 * @returns {FontFamily[]}
 */
export function merge_families(families) {
	/** @type {Map<string, FontFamily>} */
	const merged = new Map();

	for (const family of families) {
		const key = `${family.provider}:${family.name}:${family.cssVariable}`;
		const existing = merged.get(key);
		if (!existing) {
			merged.set(key, {
				...family,
				src: family.src ? [...family.src] : family.src
			});
			continue;
		}
		if (family.src?.length) {
			existing.src = [...(existing.src ?? []), ...family.src];
		}
		if (family.weights?.length) {
			existing.weights = unique_strings(existing.weights, family.weights);
		}
		if (family.styles?.length) {
			existing.styles = /** @type {FontFamily['styles']} */ (
				unique_strings(existing.styles, family.styles)
			);
		}
		if (family.subsets?.length) {
			existing.subsets = unique_strings(existing.subsets, family.subsets);
		}
	}

	return [...merged.values()];
}

/**
 * @param {string[] | undefined} existing
 * @param {string[]} incoming
 * @returns {string[]}
 */
function unique_strings(existing, incoming) {
	return [...new Set([...(existing ?? []), ...incoming])];
}

/**
 * Root-relative when Vite's base is `./` (Kit `paths.relative`), so nested
 * routes do not resolve fonts against the document directory.
 *
 * @param {string | undefined} vite_base
 * @param {string} [kit_paths_base]
 * @returns {string}
 */
export function font_public_base(vite_base, kit_paths_base = '') {
	const b = vite_base ?? '/';
	if (/^[a-z][a-z0-9+.-]*:/i.test(b) || b.startsWith('//')) {
		return b;
	}
	if (b === './' || b === '.') {
		return (kit_paths_base ?? '').replace(/\/+$/, '');
	}
	return b;
}

/**
 * @param {{ base?: string; define?: Record<string, string> }} config
 * @returns {string}
 */
export function font_base_from_vite_config(config) {
	let kit_paths_base = '';
	const raw = config.define?.__SVELTEKIT_PATHS_BASE__;
	if (typeof raw === 'string') {
		try {
			const parsed = JSON.parse(raw);
			if (typeof parsed === 'string') kit_paths_base = parsed;
		} catch {
			// ignore invalid define replacements
		}
	}
	return font_public_base(config.base, kit_paths_base);
}

/**
 * @param {string} base
 * @param {string} file_name
 * @returns {string}
 */
export function join_font_url(base, file_name) {
	const file = file_name.replace(/^\/+/, '');
	if (/^[a-z][a-z0-9+.-]*:/i.test(base) || base.startsWith('//')) {
		const origin = base.endsWith('/') ? base : `${base}/`;
		return new URL(file, origin).href;
	}
	if (!base || base === '/' || base === '.' || base === './') {
		return `/${file}`;
	}
	const prefix = base.replace(/\/+$/, '');
	return `${prefix}/${file}`.replace(/\/{2,}/g, '/');
}

/**
 * @param {FontFamily[]} families
 * @param {ResolveContext} ctx
 * @returns {Promise<ResolvedFamilies>}
 */
export async function resolve_families(families, ctx) {
	const validated = merge_families(validate_families(families));
	/** @type {EmittedFontFile[]} */
	const files = [];
	/** @type {FontRegistry} */
	const by_css_variable = {};
	/** @type {Map<string, EmittedFontFile>} */
	const file_by_hash = new Map();

	const assets_dir = ctx.assets_dir.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
	const base = ctx.base ?? '/';

	for (const family of validated) {
		/** @type {Array<{ url: string; weight: string; style: string; subset?: string; unicode_range?: string }>} */
		const faces = [];

		if (family.provider === 'local') {
			for (const src of family.src ?? []) {
				faces.push(emit_local_face(src, family, ctx, assets_dir, base, files, file_by_hash));
			}
		} else {
			const remote = ctx.resolve_google
				? await ctx.resolve_google(family)
				: await resolve_google_family(family);
			for (const face of remote) {
				faces.push(emit_bytes_face(face, family, assets_dir, base, files, file_by_hash));
			}
		}

		if (faces.length === 0) {
			throw new Error(`No font files resolved for ${family.cssVariable} (${family.name})`);
		}

		by_css_variable[family.cssVariable] = {
			css: render_family_css(family, faces),
			preloads: unique_by_href(
				faces.map((face) => ({
					href: face.url,
					type: 'font/woff2',
					subset: face.subset
				}))
			),
			data: faces.map((face) => ({
				src: [{ url: face.url, format: 'woff2' }],
				weight: face.weight,
				style: face.style,
				subset: face.subset
			}))
		};
	}

	return { files, by_css_variable };
}

/**
 * @param {LocalFontSrc} src
 * @param {FontFamily} family
 * @param {ResolveContext} ctx
 * @param {string} assets_dir
 * @param {string} base
 * @param {EmittedFontFile[]} files
 * @param {Map<string, EmittedFontFile>} file_by_hash
 */
function emit_local_face(src, family, ctx, assets_dir, base, files, file_by_hash) {
	const file_path = path.resolve(ctx.root, src.path);
	if (!fs.existsSync(file_path)) {
		throw new Error(`Local font file not found: ${src.path}`);
	}
	const bytes = fs.readFileSync(file_path);
	return emit_bytes_face(
		{
			url: pathToFileURL(file_path).href,
			bytes,
			weight: src.weight ?? '400',
			style: src.style ?? 'normal',
			subset: src.subset ?? 'latin'
		},
		family,
		assets_dir,
		base,
		files,
		file_by_hash
	);
}

/**
 * @param {ResolvedRemoteFace} face
 * @param {FontFamily} family
 * @param {string} assets_dir
 * @param {string} base
 * @param {EmittedFontFile[]} files
 * @param {Map<string, EmittedFontFile>} file_by_hash
 */
function emit_bytes_face(face, family, assets_dir, base, files, file_by_hash) {
	const hash = content_hash(face.bytes);
	const existing = file_by_hash.get(hash);
	if (existing) {
		return {
			url: existing.url,
			weight: face.weight,
			style: face.style,
			subset: face.subset,
			unicode_range: face.unicode_range
		};
	}

	const file_name = `${assets_dir}/fonts/${slug(family.name)}-${face.weight}-${face.style}.${hash}.woff2`;
	const url = join_font_url(base, file_name);
	const emitted = { file_name, source: face.bytes, url };
	file_by_hash.set(hash, emitted);
	files.push(emitted);
	return {
		url,
		weight: face.weight,
		style: face.style,
		subset: face.subset,
		unicode_range: face.unicode_range
	};
}

/**
 * @param {FontFamily} family
 * @returns {Promise<ResolvedRemoteFace[]>}
 */
export async function resolve_google_family(family) {
	const { createUnifont, providers } = await import('unifont');
	const unifont = await createUnifont([providers.google()]);
	const result = await unifont.resolveFont(family.name, {
		weights: family.weights ?? ['400'],
		styles: family.styles ?? ['normal'],
		subsets: family.subsets ?? ['latin']
	});

	/** @type {ResolvedRemoteFace[]} */
	const faces = [];
	for (const font of result.fonts ?? []) {
		const sources = Array.isArray(font.src) ? font.src : [];
		for (const src of sources) {
			if (!('url' in src) || !src.url) continue;
			const response = await fetch(src.url, font.meta?.init);
			if (!response.ok) {
				throw new Error(`Failed to download ${src.url}: ${response.status}`);
			}
			const bytes = Buffer.from(await response.arrayBuffer());
			const weight = Array.isArray(font.weight)
				? `${font.weight[0]} ${font.weight[1]}`
				: String(font.weight ?? '400');
			faces.push({
				url: src.url,
				bytes,
				weight,
				style: font.style ?? 'normal',
				subset: font.meta?.subset ?? 'latin',
				unicode_range: font.unicodeRange?.join(', ')
			});
		}
	}

	if (faces.length === 0) {
		throw new Error(`Could not resolve Google font "${family.name}"`);
	}

	return faces;
}
