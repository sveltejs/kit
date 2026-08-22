<script lang="ts">
	
	import manual_image1 from './no.png';
	
	import manual_image2 from './no.svg';

	const src = manual_image1;
	const images = [manual_image1, manual_image2];
	const get_image = (image_key: number) => images[image_key];
	const __img = 'existing declaration';

	let foo: string = 'bar';
</script>

{foo}

<img src="./dev.png" alt="non-enhanced test" />

<picture><source srcset="/1 1440w, /2 960w" type="image/avif" /><source srcset="/3 1440w, /4 960w" type="image/webp" /><source srcset="5 1440w, /6 960w" type="image/png" /><img src="/7" alt="dev test" width=1440 height=1440 /></picture>

<div>
	<picture><source srcset="/1 1440w, /2 960w" type="image/avif" /><source srcset="/3 1440w, /4 960w" type="image/webp" /><source srcset="5 1440w, /6 960w" type="image/png" /><img src="/7" alt="nested test" width=1440 height=1440 /></picture>
</div>

<picture><source srcset={"__VITE_ASSET__2AM7_y_a__ 1440w, __VITE_ASSET__2AM7_y_b__ 960w"} type="image/avif" /><source srcset={"__VITE_ASSET__2AM7_y_c__ 1440w, __VITE_ASSET__2AM7_y_d__ 960w"} type="image/webp" /><source srcset={"__VITE_ASSET__2AM7_y_e__ 1440w, __VITE_ASSET__2AM7_y_f__ 960w"} type="image/png" /><img src={"__VITE_ASSET__2AM7_y_g__"} alt="production test" width=1440 height=1440 /></picture>

<picture><source srcset="/1 1440w, /2 960w" type="image/avif" /><source srcset="/3 1440w, /4 960w" type="image/webp" /><source srcset="5 1440w, /6 960w" type="image/png" /><img src="/7" width="5" height="10" alt="dimensions test" /></picture>

<picture><source srcset="/1 1440w, /2 960w" type="image/avif" /><source srcset="/3 1440w, /4 960w" type="image/webp" /><source srcset="5 1440w, /6 960w" type="image/png" /><img src="/7" alt="directive test" width=1440 height=1440 /></picture>

<picture><source srcset="/1 1440w, /2 960w" type="image/avif" /><source srcset="/3 1440w, /4 960w" type="image/webp" /><source srcset="5 1440w, /6 960w" type="image/png" /><img src="/7" {...{ foo }} alt="spread attributes test" width=1440 height=1440 /></picture>

<picture><source srcset="/1 1440w, /2 960w" sizes="(min-width: 60rem) 80vw, (min-width: 40rem) 90vw, 100vw" type="image/avif" /><source srcset="/3 1440w, /4 960w" sizes="(min-width: 60rem) 80vw, (min-width: 40rem) 90vw, 100vw" type="image/webp" /><source srcset="5 1440w, /6 960w" sizes="(min-width: 60rem) 80vw, (min-width: 40rem) 90vw, 100vw" type="image/png" /><img src="/7" alt="sizes test" width=1440 height=1440 /></picture>

<picture><source srcset="/1 1440w, /2 960w" type="image/avif" /><source srcset="/3 1440w, /4 960w" type="image/webp" /><source srcset="5 1440w, /6 960w" type="image/png" /><img src="/7" onclick={() => (foo = 'clicked an image!')} alt="event handler test" width=1440 height=1440 /></picture>

<picture><source srcset="/1 1440w, /2 960w" type="image/avif" /><source srcset="/3 1440w, /4 960w" type="image/webp" /><source srcset="5 1440w, /6 960w" type="image/png" /><img src="/7" alt="alias test" width=1440 height=1440 /></picture>

<picture><source srcset="/1 1440w, /2 960w" type="image/avif" /><source srcset="/3 1440w, /4 960w" type="image/webp" /><source srcset="5 1440w, /6 960w" type="image/png" /><img src="/7" alt="absolute path test" width=1440 height=1440 /></picture>

{#if typeof src === 'string'}
	{#if
	import.meta.env.DEV && false}
		{src} was not enhanced. Cannot determine dimensions.
	{:else}
		<img src={src} alt="attribute shorthand test" />
	{/if}
{:else}
	<picture>
		{#each Object.entries(src.sources) as [format, srcset]}
			<source {srcset} type={'image/' + format} />
		{/each}
		<img src={src.img.src} alt="attribute shorthand test" width={src.img.w} height={src.img.h} />
	</picture>
{/if}

{#each images as image}
	{#if typeof image === 'string'}
	{#if
	import.meta.env.DEV && false}
		{image} was not enhanced. Cannot determine dimensions.
	{:else}
		<img src={image} alt="opt-in test" />
	{/if}
{:else}
	<picture>
		{#each Object.entries(image.sources) as [format, srcset]}
			<source {srcset} type={'image/' + format} />
		{/each}
		<img src={image.img.src} alt="opt-in test" width={image.img.w} height={image.img.h} />
	</picture>
{/if}
{/each}

{#each images as _, i}
	{const __img_1 = get_image(i)}
{#if typeof __img_1 === 'string'}
	{#if
	import.meta.env.DEV && false}
		{__img_1} was not enhanced. Cannot determine dimensions.
	{:else}
		<img src={__img_1} alt="opt-in test" />
	{/if}
{:else}
	<picture>
		{#each Object.entries(__img_1.sources) as [format, srcset]}
			<source {srcset} type={'image/' + format} />
		{/each}
		<img src={__img_1.img.src} alt="opt-in test" width={__img_1.img.w} height={__img_1.img.h} />
	</picture>
{/if}
{/each}

{#each images as _, j}
	{const __img_2 = get_image(j)}
{#if typeof __img_2 === 'string'}
	{#if
	import.meta.env.DEV && false}
		{__img_2} was not enhanced. Cannot determine dimensions.
	{:else}
		<img src={__img_2} alt="collision test" />
	{/if}
{:else}
	<picture>
		{#each Object.entries(__img_2.sources) as [format, srcset]}
			<source {srcset} type={'image/' + format} />
		{/each}
		<img src={__img_2.img.src} alt="collision test" width={__img_2.img.w} height={__img_2.img.h} />
	</picture>
{/if}
{/each}

{const __img_3 = foo ? manual_image1 : manual_image2}
{#if typeof __img_3 === 'string'}
	{#if
	import.meta.env.DEV && false}
		{__img_3} was not enhanced. Cannot determine dimensions.
	{:else}
		<img src={__img_3} alt="conditional test" />
	{/if}
{:else}
	<picture>
		{#each Object.entries(__img_3.sources) as [format, srcset]}
			<source {srcset} type={'image/' + format} />
		{/each}
		<img src={__img_3.img.src} alt="conditional test" width={__img_3.img.w} height={__img_3.img.h} />
	</picture>
{/if}

<picture>
	<source src="./dev.avif" />
	<source srcset="./dev.avif 500v ./bar.avif 100v" />
	<source srcset="./dev.avif, ./bar.avif 1v" />
</picture>
