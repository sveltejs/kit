<script context="module">
	import {
		providers,
		domains,
		device_sizes,
		image_sizes
	} from 'virtual:__svelte-image-options__.js';
	import { DEV } from 'esm-env';

	const all_sizes = image_sizes.concat(device_sizes);

	/**
	 * Calculate the widths to use for the srcset using the following logic:
	 * - If the sizes prop is set, use the vw sizes in the sizes prop.
	 * 	 Calculate the smallest ratio to the device size and use that to filter out all sizes that will never be used.
	 * - Always filter out all sizes above 2x the width (because upscaling beyond 2x is wasteful)
	 * - Never use widths outside the device/image sizes because many CDNs work with fixed sizes to prevent abuse
	 *
	 * @param {number} width
	 * @param {boolean} fixed
	 * @param {string | undefined} sizes
	 */
	function getWidths(width, fixed, sizes) {
		if (sizes) {
			const viewport_width = /(^|\s)(1?\d?\d)vw/g;
			const percent_sizes = [];
			for (let match; (match = viewport_width.exec(sizes)); match) {
				percent_sizes.push(parseInt(match[2]));
			}
			if (percent_sizes.length) {
				const smallest_ratio = Math.min(...percent_sizes) * 0.01;
				return {
					widths: all_sizes.filter((s) => s >= device_sizes[0] * smallest_ratio && s <= width * 2),
					kind: 'w'
				};
			}
			return { widths: all_sizes.filter((s) => s <= width * 2), kind: 'w' };
		}
		if (!fixed) {
			return { widths: device_sizes.filter((s) => s <= width * 2), kind: 'w' };
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
				[width, width * 2].map(
					(w) => all_sizes.find((p) => p >= w) || all_sizes[all_sizes.length - 1]
				)
			)
		];
		return { widths, kind: 'x' };
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
</script>

<script>
	/** @type {string | import('vite-imagetools').Img | import('vite-imagetools').Picture} */
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
	/** @type {any} */
	export let providerOptions = undefined;
	/** @type {'lazy' | 'eager' | undefined} */
	export let loading = undefined;
	/** @type {boolean} */
	export let priority = false;

	/** @type {import('vite-imagetools').Picture['sources'] | undefined} */
	let picture_sources;
	/** @type {string | undefined} */
	let srcset;
	let _src = '';

	$: {
		if (typeof src !== 'string') {
			picture_sources = /** @type {import('vite-imagetools').Picture} */ (src).sources;
			const img_src =
				/** @type {import('vite-imagetools').Picture} */ (src).img ??
				/** @type {import('vite-imagetools').Img} */ (src);
			srcset = /** @type {import('vite-imagetools').Img} */ (src).srcset
				?.map((i) => `${i.src} ${i.w}w`)
				?.join(', ');
			_src = img_src.src;
			width = width || img_src.w;
			height = height || img_src.h;
		} else {
			if (DEV && (!width || !height)) {
				console.error(
					`@sveltejs/image: You must provide a width and height for image with src '${src}'. Not providing these will cause layout shift which harms UX and SEO.`
				);
			}

			if (matches_domain(src)) {
				const p = providers[provider];
				if (DEV && !p) {
					throw new Error(
						`@sveltejs/image: No provider named "${provider}" found. Available providers are ${Object.keys(
							providers
						).join(', ')}.`
					);
				}

				const widths = getWidths(width, !!style && /width: \d+(px|em|rem)/.test(style), sizes);
				srcset = widths.widths
					.map((w) => {
						const url = DEV
							? src
							: p.getURL({
									src: /** @type {string} */ (src),
									width: w,
									options: providerOptions
							  });
						return `${url} ${w}${widths.kind}`;
					})
					.join(', ');
				_src = srcset.at(-1) ?? src;
			} else {
				if (DEV) {
					console.warn(
						`@sveltejs/image: Image src '${src}' does not match any of the allowed domains and will therefore not be optimized.`
					);
				}
				srcset = '';
				_src = src;
			}
		}
	}
</script>

<svelte:head>
	<!-- No preload for picture elements, browsers don't support that yet -->
	{#if priority && !picture_sources}
		<!-- don't set href because older browsers which don't support imagesrcset would probably load the wrong image -->
		<link rel="preload" as="image" imagesrcset={srcset} imagesizes={sizes} fetchpriority="high" />
	{/if}
</svelte:head>

<!-- Chrome with cache disabled seems to reload the src if it is reset during hydration which redownloads it -->
{#if picture_sources}
	<picture>
		{#each Object.entries(picture_sources) as [format, images]}
			<source srcset={images.map((i) => `${i.src} ${i.w}w`).join(', ')} type={'image/' + format} />
		{/each}
		<img
			{...$$restProps}
			fetchpriority={$$restProps.fetchpriority || (priority ? 'high' : 'auto')}
			loading={loading || (priority ? 'eager' : undefined)}
			{sizes}
			{srcset}
			{width}
			{height}
			src={_src}
			{alt}
			{style}
		/>
	</picture>
{:else}
	<img
		{...$$restProps}
		fetchpriority={$$restProps.fetchpriority || (priority ? 'high' : 'auto')}
		loading={loading || (priority ? 'eager' : undefined)}
		{sizes}
		{srcset}
		{width}
		{height}
		src={_src}
		{alt}
		{style}
	/>
{/if}
