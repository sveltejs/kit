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

<enhanced:img src="./dev.png" alt="dev test" />

<div>
	<enhanced:img src="./dev.png" alt="nested test" />
</div>

<enhanced:img src="./prod.png" alt="production test" />

<enhanced:img src="./dev.png" width="5" height="10" alt="dimensions test" />

<enhanced:img src="./dev.png?blur=5" alt="directive test" />

<enhanced:img src="./dev.png" {...{ foo }} alt="spread attributes test" />

<enhanced:img
	src="./dev.png?w=1024,640,320"
	sizes="(min-width: 60rem) 80vw, (min-width: 40rem) 90vw, 100vw"
	alt="sizes test"
/>

<enhanced:img
	src="./dev.png"
	onclick={() => (foo = 'clicked an image!')}
	alt="event handler test"
/>

<enhanced:img src="$lib/dev.png" alt="alias test" />

<enhanced:img src="/src/dev.png" alt="absolute path test" />

<enhanced:img {src} alt="attribute shorthand test" />

{#each images as image}
	<enhanced:img src={image} alt="opt-in test" />
{/each}

{#each images as _, i}
	<enhanced:img src={get_image(i)} alt="opt-in test" />
{/each}

<picture>
	<source src="./dev.avif" />
	<source srcset="./dev.avif 500v ./bar.avif 100v" />
	<source srcset="./dev.avif, ./bar.avif 1v" />
</picture>
