import { DEV } from 'esm-env';
import { sizes, loader, domains } from '__sveltekit/images';

/**
 * @param {string} src
 * @param {any} [options]
 * @returns {{ src: string, srcset?: string }}
 */
export function getImage(src, options) {
	if (DEV) {
		if (!matches_domain(src)) {
			console.warn(
				`$app/images: Image src '${src}' does not match any of the allowed domains and will therefore not be optimized.`
			);
		}
		return { srcset: src, src };
	}

	if (!matches_domain(src)) {
		return { src };
	}

	const srcset = sizes
		.map((size) => {
			const url = loader(src, size, options);
			const w = size + 'w';
			return `${url} ${w}`;
		})
		.join(', ');
	const _src = loader(src, sizes[sizes.length - 1], options);

	// Order of attributes is important here as they are set in this order
	// and having src before srcset would result in a flicker
	return { srcset, src: _src };
}

/**
 * @param {string} src
 */
function matches_domain(src) {
	const url = new URL(src, 'http://n'); // if src is protocol relative, use dummy domain
	if (url.href === src) {
		return domains.some((domain) => url.hostname === domain);
	} else {
		return true; // relative urls are always ok
	}
}
