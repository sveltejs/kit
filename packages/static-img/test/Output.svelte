<script lang="ts">
	import ___ASSET___0 from "./foo.png";
	import ___ASSET___1 from "./foo.png?blur=5";
	import ___ASSET___2 from "./foo.svg";
	import ___ASSET___3 from "$lib/foo.png";
	
	import manual_image1 from './no.png';
	
	import manual_image2 from './no.svg';

	const images = [
		manual_image1,
		manual_image2
	];

	let foo: string = 'bar'
</script>

{foo}

<picture>
	{#each Object.entries(___ASSET___0.sources) as [format, images]}
		<source srcset={images.map((i) => `${i.src} ${i.w}w`).join(', ')} type={'image/' + format} />
	{/each}
	<img src={___ASSET___0.img.src} alt="test" width={___ASSET___0.img.w} height={___ASSET___0.img.h} />
</picture>

<picture>
	{#each Object.entries(___ASSET___0.sources) as [format, images]}
		<source srcset={images.map((i) => `${i.src} ${i.w}w`).join(', ')} type={'image/' + format} />
	{/each}
	<img src={___ASSET___0.img.src} width="5" height="10" alt="test" />
</picture>

<picture>
	{#each Object.entries(___ASSET___1.sources) as [format, images]}
		<source srcset={images.map((i) => `${i.src} ${i.w}w`).join(', ')} type={'image/' + format} />
	{/each}
	<img src={___ASSET___1.img.src} alt="test" width={___ASSET___1.img.w} height={___ASSET___1.img.h} />
</picture>

<picture>
	{#each Object.entries(___ASSET___0.sources) as [format, images]}
		<source srcset={images.map((i) => `${i.src} ${i.w}w`).join(', ')} type={'image/' + format} />
	{/each}
	<img src={___ASSET___0.img.src} {...{foo}} alt="test" width={___ASSET___0.img.w} height={___ASSET___0.img.h} />
</picture>

<img src="{___ASSET___2}" on:click={foo = 'clicked an image!'} alt="test" />

<picture>
	{#each Object.entries(___ASSET___3.sources) as [format, images]}
		<source srcset={images.map((i) => `${i.src} ${i.w}w`).join(', ')} type={'image/' + format} />
	{/each}
	<img src={___ASSET___3.img.src} alt="test" width={___ASSET___3.img.w} height={___ASSET___3.img.h} />
</picture>

<img src="/foo.png" alt="test" />

{#each images as image}
	<!-- static-img-enable -->
	{#if typeof image === 'string'}
	<img src={image.img.src} alt="test" width={image.img.w} height={image.img.h} />
{:else}
	<picture>
	{#each Object.entries(image.sources) as [format, images]}
		<source srcset={images.map((i) => `${i.src} ${i.w}w`).join(', ')} type={'image/' + format} />
	{/each}
	<img src={image.img.src} alt="test" width={image.img.w} height={image.img.h} />
</picture>
{/if}
{/each}

<!-- static-img-disable -->
<img src="./foo.png" alt="test" />

<img srcset="./foo.png" alt="test" />

<picture>
	<source src="./foo.avif" />
	<source srcset="./foo.avif 500v ./bar.avif 100v" />
	<source srcset="./foo.avif, ./bar.avif 1v" />
</picture>

<img src="https://example.com/foo.png" alt="test" />
