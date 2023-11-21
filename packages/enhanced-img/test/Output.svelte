<script lang="ts">
	import ___ASSET___0 from "./foo.svg";
	
	import manual_image1 from './no.png';
	
	import manual_image2 from './no.svg';

	const images = [manual_image1, manual_image2];

	let foo: string = 'bar';
</script>

{foo}

<img src="./foo.png" alt="non-enhanced test" />

<picture><source srcset={"/1 1440w, /2 960w"} type="image/avif" /><source srcset={"/3 1440w, /4 960w"} type="image/webp" /><source srcset={"5 1440w, /6 960w"} type="image/png" /><img src="/7" alt="basic test" width=1440 height=1440 /></picture>

<picture><source srcset={"/1 1440w, /2 960w"} type="image/avif" /><source srcset={"/3 1440w, /4 960w"} type="image/webp" /><source srcset={"5 1440w, /6 960w"} type="image/png" /><img src="/7" width="5" height="10" alt="dimensions test" width=1440 height=1440 /></picture>

<picture><source srcset={"/1 1440w, /2 960w"} type="image/avif" /><source srcset={"/3 1440w, /4 960w"} type="image/webp" /><source srcset={"5 1440w, /6 960w"} type="image/png" /><img src="/7" alt="directive test" width=1440 height=1440 /></picture>

<picture><source srcset={"/1 1440w, /2 960w"} type="image/avif" /><source srcset={"/3 1440w, /4 960w"} type="image/webp" /><source srcset={"5 1440w, /6 960w"} type="image/png" /><img src="/7" {...{ foo }} alt="spread attributes test" width=1440 height=1440 /></picture>

<picture><source srcset={"/1 1440w, /2 960w"} sizes="(min-width: 60rem) 80vw, (min-width: 40rem) 90vw, 100vw" type="image/avif" /><source srcset={"/3 1440w, /4 960w"} sizes="(min-width: 60rem) 80vw, (min-width: 40rem) 90vw, 100vw" type="image/webp" /><source srcset={"5 1440w, /6 960w"} sizes="(min-width: 60rem) 80vw, (min-width: 40rem) 90vw, 100vw" type="image/png" /><img src="/7" alt="sizes test" width=1440 height=1440 /></picture>

<picture><source srcset={"/1 1440w, /2 960w"} type="image/avif" /><source srcset={"/3 1440w, /4 960w"} type="image/webp" /><source srcset={"5 1440w, /6 960w"} type="image/png" /><img src="/7" on:click={(foo = 'clicked an image!')} alt="event handler test" width=1440 height=1440 /></picture>

<picture><source srcset={"/1 1440w, /2 960w"} type="image/avif" /><source srcset={"/3 1440w, /4 960w"} type="image/webp" /><source srcset={"5 1440w, /6 960w"} type="image/png" /><img src="/7" alt="alias test" width=1440 height=1440 /></picture>

<picture><source srcset={"/1 1440w, /2 960w"} type="image/avif" /><source srcset={"/3 1440w, /4 960w"} type="image/webp" /><source srcset={"5 1440w, /6 960w"} type="image/png" /><img src="/7" alt="absolute path test" width=1440 height=1440 /></picture>

<img src={___ASSET___0} alt="svg test" />

{#each images as image}
	{#if typeof image === 'string'}
	<img src={image.img.src} alt="opt-in test" width={image.img.w} height={image.img.h} />
{:else}
	<picture>
		{#each Object.entries(image.sources) as [format, srcset]}
			<source {srcset} type={'image/' + format} />
		{/each}
		<img src={image.img.src} alt="opt-in test" width={image.img.w} height={image.img.h} />
	</picture>
{/if}
{/each}

<picture>
	<source src="./foo.avif" />
	<source srcset="./foo.avif 500v ./bar.avif 100v" />
	<source srcset="./foo.avif, ./bar.avif 1v" />
</picture>
