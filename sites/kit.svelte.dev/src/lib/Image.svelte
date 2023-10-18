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
		{#each Object.entries(src.sources) as [format, srcset]}
			<source {srcset} type={'image/' + format} />
		{/each}
		<img src={src.img.src} {alt} {...$$restProps} />
	</picture>
{/if}
