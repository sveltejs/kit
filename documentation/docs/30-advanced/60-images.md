---
title: Images
---

Images can have a big impact on your app's performance. For best results, you should optimize them by doing the following:

- generate optimal formats like `.avif` and `.webp`
- create different sizes for different screens
- ensure that assets can be cached effectively

Doing this manually is tedious. There are a variety of techniques you can use, depending on your needs and preferences.

## Vite's built-in handling

[Vite will automatically process imported assets](https://vitejs.dev/guide/assets.html) for improved performance. This includes assets referenced via the CSS `url()` function. Hashes will be added to the filenames so that they can be cached, and assets smaller than `assetsInlineLimit` will be inlined. Vite's asset handling is most often used for images, but is also useful for video, audio, etc.

```svelte
<script>
	import logo from '$lib/assets/logo.png';
</script>

<img alt="The project logo" src={logo} />
```

## @sveltejs/enhanced-img

> **WARNING**: The `@sveltejs/enhanced-img` package is experimental. It uses pre-1.0 versioning and may introduce breaking changes with every minor version release.

`@sveltejs/enhanced-img` builds on top of Vite's built-in asset handling. It offers plug and play image processing that serves smaller file formats like `avif` or `webp`, automatically sets the intrinsic `width` and `height` of the image to avoid layout shift, creates images of multiple sizes for various devices, and strips EXIF data for privacy. It will work in any Vite-based project including, but not limited to, SvelteKit projects.

### Setup

Install:

```bash
npm install --save-dev @sveltejs/enhanced-img
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

Use in your `.svelte` components by using `<enhanced:img>` rather than `<img>` and referencing the image file with a [Vite asset import](https://vitejs.dev/guide/assets.html#static-asset-handling) path:

```svelte
<enhanced:img src="./path/to/your/image.jpg" alt="An alt text" />
```

At build time, your `<enhanced:img>` tag will be replaced with an `<img>` wrapped by a `<picture>` providing multiple image types and sizes. It's only possible to downscale images without losing quality, which means that you should provide the highest resolution image that you need — smaller versions will be generated for the various device types that may request an image.

You should provide your image at 2x resolution for HiDPI displays (a.k.a. retina displays). `<enhanced:img>` will automatically take care of serving smaller versions to smaller devices.

If you wish to add styles to your `<enhanced:img>`, you should add a `class` and target that.

### Dynamically choosing an image

You can also manually import an image asset and pass it to an `<enhanced:img>`. This is useful when you have a collection of static images and would like to dynamically choose one or [iterate over them](https://github.com/sveltejs/kit/blob/master/sites/kit.svelte.dev/src/routes/home/Showcase.svelte). In this case you will need to update both the `import` statement and `<img>` element as shown below to indicate you'd like process them.

```svelte
<script>
	import MyImage from './path/to/your/image.jpg?enhanced';
</script>

<enhanced:img src={MyImage} alt="Some alt text" />
```

You can also use [Vite's `import.meta.glob`](https://vitejs.dev/guide/features.html#glob-import). Note that you will have to specify `enhanced` via a [custom query](https://vitejs.dev/guide/features.html#custom-queries):

```js
const pictures = import.meta.glob(
	'/path/to/assets/*.{avif,gif,heif,jpeg,jpg,png,tiff,webp}',
	{
		query: {
			enhanced: true
		}
	}
);
```

### Intrinsic Dimensions

`width` and `height` are optional as they can be inferred from the source image and will be automatically added when the `<enhanced:img>` tag is preprocessed. With these attributes, the browser can reserve the correct amount of space, preventing [layout shift](https://web.dev/articles/cls). If you'd like to use a different `width` and `height` you can style the image with CSS. Because the preprocessor adds a `width` and `height` for you, if you'd like one of the dimensions to be automatically calculated then you will need to specify that:

```svelte
<style>
	.hero-image img {
		width: var(--size);
		height: auto;
	}
</style>
```

### `srcset` and `sizes`

If you have a large image, such as a hero image taking the width of the design, you should specify `sizes` so that smaller versions are requested on smaller devices. E.g. if you have a 1280px image you may want to specify something like:

```svelte
<enhanced:img src="./image.png" sizes="min(1280px, 100vw)"/>
```

If `sizes` is specified, `<enhanced:img>` will generate small images for smaller devices and populate the `srcset` attribute.

The smallest picture generated automatically will have a width of 540px. If you'd like smaller images or would otherwise like to specify custom widths, you can do that with the `w` query parameter:
```svelte
<enhanced:img
  src="./image.png?w=1280;640;400"
  sizes="(min-width:1920px) 1280px, (min-width:1080px) 640px, (min-width:768px) 400px"
/>
```

If `sizes` is not provided, then a HiDPI/Retina image and a standard resolution image will be generated. The image you provide should be 2x the resolution you wish to display so that the browser can display that image on devices with a high [device pixel ratio](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio).

### Per-image transforms

By default, enhanced images will be transformed to more efficient formats. However, you may wish to apply other transforms such as a blur, quality, flatten, or rotate operation. You can run per-image transforms by appending a query string:

```svelte
<enhanced:img src="./path/to/your/image.jpg?blur=15" alt="An alt text" />
```

[See the imagetools repo for the full list of directives](https://github.com/JonasKruckenberg/imagetools/blob/main/docs/directives.md).

## `$app/images`

In some cases, the images may not be accessible at build time — e.g. they may live inside a content management system or elsewhere. SvelteKit provides a helper through `$app/images` to make it possible to load these images using best practices. In its simplest form, you pass an image url and the intrinsic width and height of the image to `getImage` and spread the result onto an `img` tag:

```svelte
<script>
	import { getImage } from '$app/images';
</script>

<img {...getImage({ src: '/path/to/image', width: 1000, height: 800 })} alt="An alt text" />
```

The result in this case will be generated `src` and `srcset` attributes. The `srcset` will contain two resolution variants and the browser decides based on the device's pixel density which image to load.

If you provide the `sizes` property or set `layout: "fill"` instead of `width` and `height`, the `srcset` will instead contain a list of URLs for various device widths and the browser will choose the appropriate one.

```svelte
<script>
	import { getImage } from '$app/images';
</script>

<img {...getImage({ src: '/path/to/image', width: 1000, height: 800, sizes: '100vw' })} alt="An alt text" />
```

Remember to give the largest image above the fold (i.e. the largest one that is immediately visible) a `fetchpriority` of `high` to ensure browsers download it earlier and set `loading: 'lazy'` for unimportant images, which both contributes to better web vital scores.

```svelte
<script>
	import { getImage } from '$app/images';
</script>

<img {...getImage({ src: '/path/to/image', width: 1000, height: 800, sizes: '100vw', fetchpriority: 'high' })} alt="An alt text" />
```

Because `getImage` is just a simple function, you can wrap it in a function to set sensible defaults for your app, or use it as a base for a custom image component.

### Configurating an image loader

`getImage` calculates the variants for an image based on its input and the `kit.images.width` configuration, which contains an array of numbers corresponding to various screen widths. For each variant, the configured image loader is invoked when running in production - at dev time, the loader is not invoked to prevent accidental image CDN costs.

By default, no loader is configured and as such the image url is handed back without any modifications. To configure an image loader, pass a string to `kit.images.loader` which represents a path to a file on disk (either a relative path, or referencing an npm package). Some adapters like [`adapter-vercel`](adapter-vercel) provide ready-made loaders. It's also very easy to create your own loader. Here's an example using [`unpic`](https://unpic.pics/lib/), which provides solutions for a wide range of image CDNs:

```js
/// file: custom-loader.js
// @filename: ambient.d.ts
declare module 'unpic/transformers/shopify' {
	export function transform(args: any): string;
}

// @filename: index.js
// ---cut---
// This example uses shopify as the target image CDN
import { transform } from 'unpic/transformers/shopify';

/**
 * @param {string} url
 * @param {number} width
 * @param {Record<string, any>} options
 */
export default function loader(url, width, options) {
	return transform({ url, width, ...options });
}
```

A loader optionally takes a third parameter which corresponds to the `options` property passed to `getImage`. This allows for more control over the image transformation process, if needed.

### Other considerations

Using a content delivery network (CDN) can allow you to optimize images dynamically, and provides more flexibility with regards to sizes, but it may involve some setup overhead and usage costs. Depending on caching strategy, the browser may not be able to use a cached copy of the asset until a [304 response](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/304) is received from the CDN. Building HTML to target CDNs may result in slightly smaller and simpler HTML because they can serve the appropriate file format for an `<img>` tag based on the `User-Agent` header whereas build-time optimizations must produce `<picture>` tags with multiple sources. Finally, some CDNs may generate images lazily, which could have a negative performance impact for sites with low traffic and frequently changing images.

CDNs can generally be used without any need for a library, but calling the CDN and ensuring that smaller images are called for smaller screens is generally up to you. Besides using `$app/images`, there are a number of libraries with Svelte support that make it easier. [`@unpic/svelte`](https://unpic.pics/img/svelte/) is a CDN-agnostic library with support for a large number of providers. You may also find that specific CDNs like [Cloudinary](https://svelte.cloudinary.dev/) have Svelte support. Finally, some content management systems (CMS) which support Svelte (such as [Contentful](https://www.contentful.com/sveltekit-starter-guide/), [Storyblok](https://github.com/storyblok/storyblok-svelte), and [Contentstack](https://www.contentstack.com/docs/developers/sample-apps/build-a-starter-website-with-sveltekit-and-contentstack)) have built-in support for image handling.

## Best practices

- For each image type, use the appropriate solution from those discussed above. You can mix and match all three solutions in one project. For example, you may use Vite's built-in handling to provide images for `<meta>` tags, display images on your homepage with `@sveltejs/enhanced-img`, and display user-submitted content with a dynamic approach.
- Consider serving all images via CDN regardless of the image optimization types you use. CDNs reduce latency by distributing copies of static assets globally.
- Your original images should have a good quality/resolution and should have 2x the width it will be displayed at to serve HiDPI devices. Image processing can size images down to save bandwidth when serving smaller screens, but it would be a waste of bandwidth to invent pixels to size images up.
- For images which are much larger than the width of a mobile device (roughly 400px), such as a hero image taking the width of the page design, specify `sizes` so that smaller images can be served on smaller devices.
- Choose one image per page which is the most important/largest one and give it `priority` so it loads faster. This gives you better web vitals scores (largest contentful paint in particular).
- Give the image a container or styling so that it is constrained and does not jump around. `width` and `height` help the browser reserving space while the image is still loading. `@sveltejs/enhanced-img` will add a `width` and `height` for you.
- Always provide a good `alt` text. The Svelte compiler will warn you if you don't do this.
