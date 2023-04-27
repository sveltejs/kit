<script>
	import { Image } from '@sveltejs/image';
	import Test from './twitter-thumbnail.jpg?generate';
</script>

<h1>Image playground</h1>

<p>
	Locally no transformation happens; deploy to Vercel (pnpm build && vercel deploy --prebuilt) to
	see image optimization happening
</p>

<Image
	src="/images/svelte-android-chrome-192.png"
	loading="eager"
	width={100}
	height={100}
	alt="asd"
/>

<Image
	src="/images/svelte-kit-machine.webp"
	width={1000}
	height={1000}
	sizes="90vw"
	style="width: 400px; height: auto;"
	alt="asd2"
/>

<Image src={Test} alt="priority" priority />
