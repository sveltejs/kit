<script lang="ts">
	import manual_image1 from './no.png';
	import manual_image2 from './no.svg';

	const images = [manual_image1, manual_image2];

	let foo: string = 'bar';
</script>

{foo}

<img src="./foo.png" alt="non-enhanced test" />

<enhanced:img src="./foo.png" alt="basic test" />

<enhanced:img src="./foo.png" width="5" height="10" alt="dimensions test" />

<enhanced:img src="./foo.png?blur=5" alt="directive test" />

<enhanced:img src="./foo.png" {...{ foo }} alt="spread attributes test" />

<enhanced:img
	src="./foo.png?w=1024,640,320"
	sizes="(min-width: 60rem) 80vw, (min-width: 40rem) 90vw, 100vw"
	alt="sizes test"
/>

<enhanced:img src="./foo.png" on:click={(foo = 'clicked an image!')} alt="event handler test" />

<enhanced:img src="$lib/foo.png" alt="alias test" />

<enhanced:img src="/src/foo.png" alt="absolute path test" />

<enhanced:img src="./foo.svg" alt="svg test" />

{#each images as image}
	<enhanced:img src={image} alt="opt-in test" />
{/each}

<picture>
	<source src="./foo.avif" />
	<source srcset="./foo.avif 500v ./bar.avif 100v" />
	<source srcset="./foo.avif, ./bar.avif 1v" />
</picture>
