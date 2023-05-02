# `@sveltejs/image`

**WARNING**: This package is experimental. It uses pre-1.0 versioning and may introduce breaking changes with every minor version release.

This package aims to bring a plug and play image component to SvelteKit that is opinionated enough so you don't have to worry about the details, yet flexible enough for more advanced use cases or tweaks. It serves a smaller file format like `avif` or `webp` and uses the `srcset` and `sizes` attributes of the `img` tag to provide resized images suitable for various device sizes, which for example results in smaller images downloaded for mobile.

## Setup

Install:

```bash
npm install --save @sveltejs/image
```

Adjust `vite.config.js`:

```diff
+import { images } from '@sveltejs/image/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
+		images({ providers: { default: '@sveltejs/image/providers/<choose one>' } }),
		sveltekit()
	]
});
```

> `<choose one>` refers to choosing one of the ready-to-use providers. We plan to add more providers over time. You can create your own by creating a JavaScript with a `export function getURL({ src, width, height }): string` function inside.

In case of Vercel, adjust `svelte.config.js`:

```diff
import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
-		adapter: adapter()
+		adapter: adapter({ images: true })
	}
};

export default config;
```

## Usage

### When using one of the providers, i.e. an image CDN:

```svelte
<script>
	import Image from '@sveltejs/image';
</script>

<Image src="/path/to/your/image.jpg" width={1200} height={1800} alt="An alt text" />
```

`width` and `height` should be the intrinsic width/height of the referenced image - i.e. the dimensions of the image before styling. `alt` should describe the image. All are required. The `src` is transformed by calling `getURL` of the `default` provider provided in the `vite.config.js`.

### Static build time optimization:

Install:

```bash
npm install --save-dev vite-imagetools
```

Use in your `.svelte` components:

```svelte
<script>
	import Image from '@sveltejs/image';
	import YourImage from '/path/to/your/image.jpg';
</script>

<Image src={YourImage} alt="An alt text" />
```

This optimizes the image at build time using `vite-imagetools`. `width` and `height` are optional as they can be inferred from the source image.

### Choosing static vs dynamic

Using the static provider generates the images at build time, so that build time may take longer the more images you transform.

Using an image CDN provides more flexibility with regards to sizes and you can pass image sources not known at build time, but it comes with potentially a bit setup overhead (configuring the image CDN) and possibly usage cost.

You can mix and match both solutions in one project.

### `Image` component props

There are a few things you can customize:

- `priority`: set this to `true` for the most important/largest image on the page so it loads faster
- `sizes`: If your image is less than full width on one or more screen sizes, add this info here. When using dynamic providers the widths can be adjusted accordingly to produce a more optimal `srcset`. See [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/sizes) for more info on the attribute
- `style`: to style the image
- `class`: to style the image. Be aware that you need to pass classes that are global (i.e. wrapped in `:global()` when coming from a `<style>` tag)
- `loading`: loading behavior of the image. Defaults to `lazy` which means it's loaded only when about to enter the viewport. Set to `eager` to load right away (the default when setting `priority`)
- `provider`: you can pass more than the `default` provider in `vite.config.js`. If you then want to use a different provider than the `default` one, pass it here
- `providerOptions`: provider-specific image CDN options. For example `quality` for Vercel

## Best practices

- Always provide a good `alt` text
- Your original images should have a good quality/resolution. Images are easier to size down than up
- Choose one image per page which is the most important/largest one and give it `priority` so it loads faster. This gives you better web vitals scores (largest contentful paint in particular)
- Give the image a container or a styling so that it is constrained and does not jump around. `width` and `height` help the browser reserving space while the image is still loading

## Roadmap

This is an experimental MVP for getting initial feedback on the implementation/usability of an image component usable with SvelteKit (can also be used with Vite only). Once the API is stable, we'll want to create a more seamless integration with SvelteKit, i.e. less setup required.

## Acknowledgements

We'd like to thank the authors of the Next/Nuxt/Astro/`unpic` image components for inspiring this work.
