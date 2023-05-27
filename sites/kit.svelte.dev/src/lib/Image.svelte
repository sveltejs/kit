<script>
	/** @type {string | import('vite-imagetools').Picture} */
	export let src;

	/** @type {string} */
	export let alt;
</script>

{#if typeof src === 'string'}
	<img {src} {alt} {...$$restProps} />
{:else}
	<picture>
		{#each Object.entries(src.sources) as [format, images]}
			<source srcset={images.map((i) => `${i.src} ${i.w}w`).join(', ')} type={'image/' + format} />
		{/each}
		<img src={src.fallback.src} {alt} {...$$restProps} />
	</picture>
{/if}
