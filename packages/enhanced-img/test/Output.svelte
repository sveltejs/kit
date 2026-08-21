<script lang="ts">
	
	import manual_image1 from './no.png';
	
	import manual_image2 from './no.svg';

	const src = manual_image1;
	const images = [manual_image1, manual_image2];
	const get_image = (image_key: number) => images[image_key];

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

{const __sveltekit_enhanced_img_1072 = src}
{#if typeof __sveltekit_enhanced_img_1072 === 'string'}
	{#if 
	import.meta.env.DEV && false}
		{__sveltekit_enhanced_img_1072} was not enhanced. Cannot determine dimensions.
	{:else}
		<img src={__sveltekit_enhanced_img_1072} alt="attribute shorthand test" />
	{/if}
{:else}
	<picture>
		{#each Object.entries(__sveltekit_enhanced_img_1072.sources) as [format, srcset]}
			<source {srcset} type={'image/' + format} />
		{/each}
		<img src={__sveltekit_enhanced_img_1072.img.src} alt="attribute shorthand test" width={__sveltekit_enhanced_img_1072.img.w} height={__sveltekit_enhanced_img_1072.img.h} />
	</picture>
{/if}

{#each images as image}
	{const __sveltekit_enhanced_img_1152 = image}
{#if typeof __sveltekit_enhanced_img_1152 === 'string'}
	{#if 
	import.meta.env.DEV && false}
		{__sveltekit_enhanced_img_1152} was not enhanced. Cannot determine dimensions.
	{:else}
		<img src={__sveltekit_enhanced_img_1152} alt="opt-in test" />
	{/if}
{:else}
	<picture>
		{#each Object.entries(__sveltekit_enhanced_img_1152.sources) as [format, srcset]}
			<source {srcset} type={'image/' + format} />
		{/each}
		<img src={__sveltekit_enhanced_img_1152.img.src} alt="opt-in test" width={__sveltekit_enhanced_img_1152.img.w} height={__sveltekit_enhanced_img_1152.img.h} />
	</picture>
{/if}
{/each}

{#each images as _, i}
	{const __sveltekit_enhanced_img_1232 = get_image(i)}
{#if typeof __sveltekit_enhanced_img_1232 === 'string'}
	{#if 
	import.meta.env.DEV && false}
		{__sveltekit_enhanced_img_1232} was not enhanced. Cannot determine dimensions.
	{:else}
		<img src={__sveltekit_enhanced_img_1232} alt="opt-in test" />
	{/if}
{:else}
	<picture>
		{#each Object.entries(__sveltekit_enhanced_img_1232.sources) as [format, srcset]}
			<source {srcset} type={'image/' + format} />
		{/each}
		<img src={__sveltekit_enhanced_img_1232.img.src} alt="opt-in test" width={__sveltekit_enhanced_img_1232.img.w} height={__sveltekit_enhanced_img_1232.img.h} />
	</picture>
{/if}
{/each}

<picture>
	<source src="./dev.avif" />
	<source srcset="./dev.avif 500v ./bar.avif 100v" />
	<source srcset="./dev.avif, ./bar.avif 1v" />
</picture>
