import { DEV } from 'esm-env';
import { widths as default_widths, loader } from '__sveltekit/images';

/**
 * @typedef {{
 *  src: string;
 *  sizes?: string;
 *  fetchpriority?: 'high' | 'low' | 'auto';
 *  loading?: 'eager' | 'lazy';
 *  style?: string;
 *  class?: string;
 *  alt?: string;
 *  options?: Record<string, any>;
 *  } & ({ width: number; height: number } | { layout: 'fill' | 'custom', width?: number; height?: number })
 * } ImageOptions
 */

/**
 * @param {ImageOptions} payload
 * @returns {{ src: string, srcset: string, sizes?: string, width?: number, height?: number, loading?: 'eager' | 'lazy', fetchpriority?: 'high' | 'low' | 'auto', style?: string, class?: string, alt?: string }}
 */
export function getImage(payload) {
	const src = payload.src;
	const widths = get_widths(payload.width, payload.sizes);

	if (DEV) {
		if (!('width' in payload) && !('layout' in payload)) {
			console.warn(
				`Missing 'width' or 'layout' for image ${src}. Provide one of them to prevent layout shift.`
			);
		}
	}

	let _src = src;
	const srcset = widths.widths
		.map((width, i) => {
			const url = DEV ? src : loader(src, width, payload.options);
			_src = url; // ensures that the largest one is set
			const w = widths.kind === 'x' ? `${i + 1}x` : `${width}w`;
			return `${url} ${w}`;
		})
		.join(', ');

	let style = payload.style;
	// @ts-expect-error
	if (payload.layout === 'fill') {
		style = 'position:absolute;width:100%;height:100%;inset:0px;' + (style || '');
	}

	// Order of attributes is important here as they are set in this order
	// and having src before srcset would result in a flicker
	return {
		srcset,
		src: _src,
		sizes: payload.sizes,
		loading: payload.loading,
		fetchpriority: payload.fetchpriority,
		style,
		class: payload.class,
		width: payload.width,
		height: payload.height,
		alt: payload.alt
	};
}

/**
 * Don't use any sizes lower than this for full-width images
 */
const full_width_cutoff = 640;

/**
 * @param {number | undefined} width
 * @param {string | undefined} sizes
 * @returns {{ widths: number[]; kind: 'w' | 'x' }}
 */
function get_widths(width, sizes) {
	// We don't really know what the user wants here. But if they have an image that's really big
	// then we can probably assume they're always displaying it full viewport/breakpoint.
	// If the user is displaying a responsive image then the size usually doesn't change that much
	// Instead, the number of columns in the design may reduce and the image may take a greater
	// fraction of the screen.
	// Assume if they're bothering to specify sizes that it's going to take most of the screen
	// as that's the case where an image may be rendered at very different sizes. Otherwise, it's
	// probably a responsive image and a single size is okay (two when accounting for HiDPI).
	if (sizes || !width) {
		if (!sizes) {
			sizes = '100vw';
		}
		let widths = default_widths;
		if (sizes.trim() === '100vw') {
			// Since this is a full-screen-width image, we can trim out small widths
			widths = widths.filter((width) => width >= full_width_cutoff);
		}
		return { widths, kind: 'w' };
	}

	// Don't need more than 2x resolution. Note that due to this optimization, pixel density
	// descriptors will often end up being cheaper as many mobile devices have pixel density ratios
	// near 3 which would cause larger images to be chosen on mobile when using sizes.

	// Most OLED screens that say they are 3x resolution, are actually 3x in the green color, but
	// only 1.5x in the red and blue colors. Showing a 3x resolution image in the app vs a 2x
	// resolution image will be visually the same, though the 3x image takes significantly more
	// data. Even true 3x resolution screens are wasteful as the human eye cannot see that level of
	// detail without something like a magnifying glass.
	// https://blog.twitter.com/engineering/en_us/topics/infrastructure/2019/capping-image-fidelity-on-ultra-high-resolution-devices.html
	return {
		widths:
			// We can't just use the provided width, we need to take one of the predefined ones because
			// some image providers will throw a 400 error if the width is not one of the ones in the settings.
			[nearest_width(Math.round(width / 2)), nearest_width(width)],
		kind: 'x'
	};
}

/** @param {number} width */
function nearest_width(width) {
	const widths = default_widths;
	let i = 0;
	while (i < widths.length - 1 && widths[i] < width) i += 1;
	return widths[i];
}
