<script>
	export let src;
	export let alt;
	export let width = undefined;
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
