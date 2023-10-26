<script lang="ts">
	import ___ASSET___0 from "./foo.png?enhancedImg";
	import ___ASSET___1 from "./foo.png?imgWidth=5&enhancedImg";
	import ___ASSET___2 from "./foo.png?blur=5&enhancedImg";
	import ___ASSET___3 from "./foo.png?w=1024,640,320&imgSizes=(min-width%3A%2060rem)%2080vw%2C%20(min-width%3A%2040rem)%2090vw%2C%20100vw&enhancedImg";
	import ___ASSET___4 from "$lib/foo.png?enhancedImg";
	import ___ASSET___5 from "/src/foo.png?enhancedImg";
	
	import manual_image1 from './no.png';
	
	import manual_image2 from './no.svg';

	const images = [
		manual_image1,
		manual_image2
	];

	let foo: string = 'bar'
</script>

{foo}

<img src="./foo.png" alt="non-enhanced test" />

<picture>
	{#each Object.entries(___ASSET___0.sources) as [format, srcset]}
		<source {srcset} type={'image/' + format} />
	{/each}
	<img src={___ASSET___0.img.src} alt="basic test" imgWidth={___ASSET___0.img.w} imgHeight={___ASSET___0.img.h} />
</picture>

<picture>
	{#each Object.entries(___ASSET___1.sources) as [format, srcset]}
		<source {srcset} type={'image/' + format} />
	{/each}
	<img src={___ASSET___1.img.src} width="5" height="10" alt="dimensions test" />
</picture>

<picture>
	{#each Object.entries(___ASSET___1.sources) as [format, srcset]}
		<source {srcset} type={'image/' + format} />
	{/each}
	<img src={___ASSET___1.img.src} width=5 height=10 alt="unquoted dimensions test" />
</picture>

<picture>
	{#each Object.entries(___ASSET___2.sources) as [format, srcset]}
		<source {srcset} type={'image/' + format} />
	{/each}
	<img src={___ASSET___2.img.src} alt="directive test" imgWidth={___ASSET___2.img.w} imgHeight={___ASSET___2.img.h} />
</picture>

<picture>
	{#each Object.entries(___ASSET___0.sources) as [format, srcset]}
		<source {srcset} type={'image/' + format} />
	{/each}
	<img src={___ASSET___0.img.src} {...{foo}} alt="spread attributes test" imgWidth={___ASSET___0.img.w} imgHeight={___ASSET___0.img.h} />
</picture>

<picture>
	{#each Object.entries(___ASSET___3.sources) as [format, srcset]}
		<source {srcset}sizes="(min-width: 60rem) 80vw, (min-width: 40rem) 90vw, 100vw" type={'image/' + format} />
	{/each}
	<img src={___ASSET___3.img.src} alt="sizes test" imgWidth={___ASSET___3.img.w} imgHeight={___ASSET___3.img.h} />
</picture>

<picture>
	{#each Object.entries(___ASSET___0.sources) as [format, srcset]}
		<source {srcset} type={'image/' + format} />
	{/each}
	<img src={___ASSET___0.img.src} on:click={foo = 'clicked an image!'} alt="event handler test" imgWidth={___ASSET___0.img.w} imgHeight={___ASSET___0.img.h} />
</picture>

<picture>
	{#each Object.entries(___ASSET___4.sources) as [format, srcset]}
		<source {srcset} type={'image/' + format} />
	{/each}
	<img src={___ASSET___4.img.src} alt="alias test" imgWidth={___ASSET___4.img.w} imgHeight={___ASSET___4.img.h} />
</picture>

<picture>
	{#each Object.entries(___ASSET___5.sources) as [format, srcset]}
		<source {srcset} type={'image/' + format} />
	{/each}
	<img src={___ASSET___5.img.src} alt="absolute path test" imgWidth={___ASSET___5.img.w} imgHeight={___ASSET___5.img.h} />
</picture>

{#each images as image}
	{#if typeof image === 'string'}
	<img src={image.img.src} alt="opt-in test" imgWidth={image.img.w} imgHeight={image.img.h} />
{:else}
	<picture>
	{#each Object.entries(image.sources) as [format, srcset]}
		<source {srcset} type={'image/' + format} />
	{/each}
	<img src={image.img.src} alt="opt-in test" imgWidth={image.img.w} imgHeight={image.img.h} />
</picture>
{/if}
{/each}

<picture>
	<source src="./foo.avif" />
	<source srcset="./foo.avif 500v ./bar.avif 100v" />
	<source srcset="./foo.avif, ./bar.avif 1v" />
</picture>
