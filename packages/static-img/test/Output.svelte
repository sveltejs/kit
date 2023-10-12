<script lang="ts">
	import ___ASSET___0 from "./foo.png?static-img";
	import ___ASSET___1 from "./foo.png?width=5&static-img";
	import ___ASSET___2 from "./foo.png?blur=5&static-img";
	import ___ASSET___3 from "./foo.png?w=1024,640,320&sizes=(min-width%3A%2060rem)%2080vw%2C%20(min-width%3A%2040rem)%2090vw%2C%20100vw&static-img";
	import ___ASSET___4 from "./foo.svg?static-img";
	import ___ASSET___5 from "$lib/foo.png?static-img";
	
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
	<img src={___ASSET___0.img.src} alt="basic test" width={___ASSET___0.img.w} height={___ASSET___0.img.h} />
</picture>

<picture>
	{#each Object.entries(___ASSET___1.sources) as [format, images]}
		<source srcset={images.map((i) => `${i.src} ${i.w}w`).join(', ')} type={'image/' + format} />
	{/each}
	<img src={___ASSET___1.img.src} width="5" height="10" alt="dimensions test" />
</picture>

<picture>
	{#each Object.entries(___ASSET___1.sources) as [format, images]}
		<source srcset={images.map((i) => `${i.src} ${i.w}w`).join(', ')} type={'image/' + format} />
	{/each}
	<img src={___ASSET___1.img.src} width=5 height=10 alt="unquoted dimensions test" />
</picture>

<picture>
	{#each Object.entries(___ASSET___2.sources) as [format, images]}
		<source srcset={images.map((i) => `${i.src} ${i.w}w`).join(', ')} type={'image/' + format} />
	{/each}
	<img src={___ASSET___2.img.src} alt="directive test" width={___ASSET___2.img.w} height={___ASSET___2.img.h} />
</picture>

<picture>
	{#each Object.entries(___ASSET___0.sources) as [format, images]}
		<source srcset={images.map((i) => `${i.src} ${i.w}w`).join(', ')} type={'image/' + format} />
	{/each}
	<img src={___ASSET___0.img.src} {...{foo}} alt="spread attributes test" width={___ASSET___0.img.w} height={___ASSET___0.img.h} />
</picture>

<picture>
	{#each Object.entries(___ASSET___3.sources) as [format, images]}
		<source srcset={images.map((i) => `${i.src} ${i.w}w`).join(', ')}sizes="(min-width: 60rem) 80vw, (min-width: 40rem) 90vw, 100vw" type={'image/' + format} />
	{/each}
	<img src={___ASSET___3.img.src} alt="sizes test" width={___ASSET___3.img.w} height={___ASSET___3.img.h} />
</picture>

<img src="{___ASSET___4}" on:click={foo = 'clicked an image!'} alt="event handler test" />

<picture>
	{#each Object.entries(___ASSET___5.sources) as [format, images]}
		<source srcset={images.map((i) => `${i.src} ${i.w}w`).join(', ')} type={'image/' + format} />
	{/each}
	<img src={___ASSET___5.img.src} alt="alias test" width={___ASSET___5.img.w} height={___ASSET___5.img.h} />
</picture>

<img src="/foo.png" alt="publicDir test" />

{#each images as image}
	<!-- static-img-enable -->
	{#if typeof image === 'string'}
	<img src={image.img.src} alt="opt-in test" width={image.img.w} height={image.img.h} />
{:else}
	<picture>
	{#each Object.entries(image.sources) as [format, images]}
		<source srcset={images.map((i) => `${i.src} ${i.w}w`).join(', ')} type={'image/' + format} />
	{/each}
	<img src={image.img.src} alt="opt-in test" width={image.img.w} height={image.img.h} />
</picture>
{/if}
{/each}

<!-- static-img-disable -->
<img src="./foo.png" alt="disable test" />

<img srcset="./foo.png" alt="srcset test" />

<picture>
	<source src="./foo.avif" />
	<source srcset="./foo.avif 500v ./bar.avif 100v" />
	<source srcset="./foo.avif, ./bar.avif 1v" />
</picture>

<img src="https://example.com/foo.png" alt="full url test" />
