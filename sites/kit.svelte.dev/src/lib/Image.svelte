<script>
	/** @type {string | import('vite-imagetools').Picture} */
	export let src;

	/** @type {string} */
	export let alt;

	/** @type {number} */
	export let width = undefined;

	/** @type {number} */
	export let height = undefined;
</script>

{#if typeof src === 'string'}
	<img {src} {alt} {width} {height} />
{:else}
	<picture>
		{#each Object.entries(src.sources) as [format, images]}
			<source srcset={images.map((i) => `${i.src}`).join(', ')} type={'image/' + format} />
		{/each}
		<img src={src.fallback.src} {alt} />
	</picture>
{/if}

<style>
	picture,
	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
</style>
