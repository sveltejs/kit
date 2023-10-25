---
title: Images
---

## Caching and inlining

[Vite will automatically process imported assets](https://vitejs.dev/guide/assets.html) for improved performance. This includes assets referenced via the CSS `url()` function. Hashes will be added to the filenames so that they can be cached and assets smaller than `assetsInlineLimit` will be inlined. Vite's asset handling is most often used for images, but is also useful for video, audio, etc.

```svelte
<script>
	import logo from '$lib/assets/logo.png';
</script>

<img alt="The project logo" src={logo} />
```

To reference assets directly in the markup, you can use a preprocessor such as [`@sveltejs/enhanced-img`](#static-image-transforms), which is discussed below and additionally transforms your images.

## Transforming background

You may wish to transform your images to output compressed image formats such as `.webp` or `.avif`, responsive images with different sizes for different devices, or images with the EXIF data stripped for privacy. There are two approaches two transforming images, which will be discussed below. With either approach, the transformed images may be served via a CDN. CDNs reduce latency by distributing copies of static assets globally.

The `@sveltejs/enhanced-img` package handles images that are located in your project and can be referred to with a static string. It can automatically set the intrinsic `width` and `height` for you, which can't be done with a dynamic approach. It is generated with a hash in the filename so that it can be maximally cached. It generates images at build time, so building may take longer the more images you transform.

Alternatively, using a CDN to do the image transformation provides more flexibility with regards to sizes and you can pass image sources not known at build time, but it comes with potentially a bit of setup overhead (configuring the image CDN) and possibly usage cost. Some images served from a CDN may require a request to the server to verify that the image has not changed. This will block the browser from using its cache until a [304 response](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/304) is received from the server. Building HTML to target CDNs may result in slightly smaller and simpler HTML because they can serve the appropriate file format for an `img` tag based on the `User-Agent` header whereas build-time optimizations must produce `picture` tags. Finally some CDNs may generate images lazily, which could have a negative performance impact for sites with low traffic and frequently changing images. We do not currently offer any tools for dynamic image transforms since they're more straightforward for users to implement on their own, but we may offer such utilities in the future.

You can mix and match both solutions in one project. For example, you may display images on your homepage with `@sveltejs/enhanced-img` and display user-submitted content with a dynamic approach.

## Static image transforms

> **WARNING**: The `@sveltejs/enhanced-img` package is experimental. It uses pre-1.0 versioning and may introduce breaking changes with every minor version release.

`@sveltejs/enhanced-img` aims to offer plug and play image processing that is opinionated enough so you don't have to worry about the details, yet flexible enough for more advanced use cases or tweaks. It serves smaller file formats like `avif` or `webp`, automatically sets the intrinsic width and height of the image to avoid layout shift, and creates images of multiple sizes for use with the `sizes attribute`. It will work in any Vite-based project including, but not limited to, Svelte projects.

### Setup

Install:

```bash
npm install --save @sveltejs/enhanced-img
```

Adjust `vite.config.js`:

```diff
import { sveltekit } from '@sveltejs/kit/vite';
+import { enhancedImages } from '@sveltejs/enhanced-img';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
+		enhancedImages(),
		sveltekit()
	]
});
```

### Basic usage

Use in your `.svelte` components by referencing a relative path beginning with `./` or `$` (for Vite aliases):

```svelte
<img src="./path/to/your/image.jpg" alt="An alt text" />
```

This will replace your `img` tag with a `picture` tag wrapping one `source` tag per image type.

### Dynamically choosing an image

You can also manually import an image and then pass it to a transformed `img` tag. This is useful when you have a collection of static images and would like to dynamically choose one. You can create a collection of images manually [as we do on the homepage showcase](https://github.com/sveltejs/kit/blob/master/sites/kit.svelte.dev/src/routes/home/Showcase.svelte). In this case you will need to update both the `import` statement and `img` tag as shown below to indicate you'd like process them.

```svelte
<script>
	import { MyImage } from './path/to/your/image.jpg?enhanced-img';
</script>

<enhanced:img src={MyImage} alt="An alt text" />
```

You can also use [Vite's `import.meta.glob`](https://vitejs.dev/guide/features.html#glob-import). Note that you will have to specify `enhanced-img` via a [custom query](https://vitejs.dev/guide/features.html#custom-queries):

```js
const pictures = import.meta.glob(
	'/path/to/assets/*.{heic,heif,avif,jpg,jpeg,png,tiff,webp,gif,svg}',
	{
		query: {
			'enhanced-img': true
		}
	}
);
```

### Intrinsic Dimensions

`width` and `height` are optional as they can be inferred from the source image and will be automatically added when the `<img>` tag is preprocessed. These attributes are added because the browser can reserve the correct amount of space when it knows image dimensions which prevents layout shift. If you'd like to use a different `width` and `height` you can style the image with CSS. Because the preprocessor adds a `width` and `height` for you, if you'd like one of the dimensions to be automatically calculated then you will need to specify that:

```svelte
<style>
	.hero-image img {
		width: var(--size);
		height: auto;
	}
</style>
```

### `srcset` and `sizes`

Only `img` tags with a `src` will be processed. Those with a `srcset` will not be. You may then be wondering how to do something like:

```html
<img
  srcset="image-small.png 160w, image-medium.png 400w, image-large.png 600w"
  sizes="(min-width: 60rem) 80vw, (min-width: 40rem) 90vw, 100vw"
  />
```

In this example, we don't have you to have to manually create three versions of your image. Instead, you can specify the widths as a query parameter and we'll generate the `srcset` for you.

```svelte
<img
  src="./image.png?w=160,400,600"
  sizes="(min-width: 60rem) 80vw, (min-width: 40rem) 90vw, 100vw"
  />
```

If `sizes` is specified directly as a string on the `img` tag then the plugin will automatically generate different width images:
- If `sizes` is not provided, then a HiDPI/Retina image and a standard resolution image will be generated. The image you provide should be 2x the resolution you wish to display so that the browser can display that image on devices with a high [device pixel ratio](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio).
- If sizes is provided, then a large srcset is generated. If some of the `sizes` have been specified as a percentage of the viewport width using the `vw` unit then the `srcset` will filter out any values which are too small to ever be requested by the browser.

> Text expressions like `sizes={computedSizes}` or `sizes={['(min-width: 60rem) 80vw', '(min-width: 40rem) 90vw', '100vw'].join(', ')}` will not be evaluated for the purposes of automatic image generation and will be skipped.

### Per-image transforms

By default, your images will be transformed to more efficient formats. However, you may wish to apply other transforms such as a blur, quality, flatten, or rotate operation. You can do this by appending a query string:

```svelte
<img src="./path/to/your/image.jpg?blur=15" alt="An alt text" />
```

[See the imagetools repo for the full list of directives](https://github.com/JonasKruckenberg/imagetools/blob/main/docs/directives.md).

### Processing other images

If you have existing image imports like `import SomeImage from './some/image.jpg';` they will not be processed by this plugin.

## Best practices

- Always provide a good `alt` text
- Choose one image per page which is the most important/largest one and give it `priority` so it loads faster. This gives you better web vitals scores (largest contentful paint in particular)
- Your original images should have a good quality/resolution. Impage processing can size images down to save bandwidth when serving smaller screens, but cannot invent pixels to size images up any better than browsers can
- Give the image a container or a styling so that it is constrained and does not jump around. `width` and `height` help the browser reserving space while the image is still loading. `@sveltejs/enhanced-img` will add a `width` and `height` for you
