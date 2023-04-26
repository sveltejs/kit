<script context="module">
	import { providers, domains } from '__svelte-image-options__.js';
	import { DEV } from 'esm-env';

	const deviceSizes = [640, 750, 828, 1080, 1200, 1920, 2048, 3840];
	const allSizes = [96, 128, 256, 384, ...deviceSizes]; // lower because images could be 33% width on a mobile phone

	/**
	 * @param {number} width
	 * @param {boolean} fixed
	 * @param {string | undefined} sizes
	 */
	function getWidths(width, fixed, sizes) {
		if (sizes) {
			// Find all the "vw" percent sizes used in the sizes prop
			const viewportWidthRe = /(^|\s)(1?\d?\d)vw/g;
			const percentSizes = [];
			for (let match; (match = viewportWidthRe.exec(sizes)); match) {
				percentSizes.push(parseInt(match[2]));
			}
			if (percentSizes.length) {
				const smallestRatio = Math.min(...percentSizes) * 0.01;
				return {
					widths: allSizes.filter((s) => s >= deviceSizes[0] * smallestRatio),
					kind: 'w'
				};
			}
			return { widths: allSizes, kind: 'w' };
		}
		if (!fixed) {
			return { widths: deviceSizes, kind: 'w' };
		}

		const widths = [
			...new Set(
				// > This means that most OLED screens that say they are 3x resolution,
				// > are actually 3x in the green color, but only 1.5x in the red and
				// > blue colors. Showing a 3x resolution image in the app vs a 2x
				// > resolution image will be visually the same, though the 3x image
				// > takes significantly more data. Even true 3x resolution screens are
				// > wasteful as the human eye cannot see that level of detail without
				// > something like a magnifying glass.
				// https://blog.twitter.com/engineering/en_us/topics/infrastructure/2019/capping-image-fidelity-on-ultra-high-resolution-devices.html
				[width, width * 2].map((w) => allSizes.find((p) => p >= w) || allSizes[allSizes.length - 1])
			)
		];
		return { widths, kind: 'x' };
	}

	/**
	 * @param {string} src
	 */
	function matchesDomain(src) {
		const url = new URL(src, 'http://n'); // if src is protocol relative, use dummy domain
		if (url.href === src) {
			return domains.some((domain) => url.hostname === domain);
		} else {
			return true; // relative urls are always ok
		}
	}
</script>

<script>
	/** @type {string | { src: string; height: number; width: number; srcset: Array<{ w: string; src: string }> }} */
	export let src;
	/** @type {string} */
	export let alt;
	/** @type {number}*/
	export let width;
	/** @type {number}*/
	export let height;
	/** @type {string | undefined} */
	export let sizes = undefined;
	/** @type {string | undefined} */
	export let style = undefined;
	/** @type {string} */
	export let provider = 'default';

	let srcset = '';
	let _src = '';

	$: {
		if (typeof src !== 'string') {
			srcset = src.srcset.map((i) => `${i.src} ${i.w}w`).join(', ');
			_src = src.src;
			width = width || src.width;
			width = height || src.height;
		} else {
			if (matchesDomain(src)) {
				const p = providers[provider];
				if (DEV && !p) {
					throw new Error(
						`No provider named "${provider}" found. Available providers are ${Object.keys(
							providers
						).join(', ')}. Check the kit.images.providers configuration in your svelte.config.js.`
					);
				}

				const widths = getWidths(width, !!style && /width: \d+(px|em|rem)/.test(style), sizes);
				srcset = widths.widths
					.map((w) => {
						const url = DEV
							? src
							: p.getURL({
									src,
									width: w,
									height: Math.round(w * (width / height))
							  });
						return `${url} ${w}${widths.kind}`;
					})
					.join(', ');
				_src = DEV ? src : p.getURL({ src, width, height });
			} else {
				srcset = '';
				_src = src;
			}
		}
	}
</script>

<img {sizes} {srcset} {width} {height} src={_src} {alt} {style} {...$$restProps} />
