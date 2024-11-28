<script>
	import { preloadData } from '$app/navigation';

	let data = {};
</script>

<button
	type="button"
	on:click={async () => {
		data = await preloadData('/routing/preloading/error/404');
	}}>404</button
>

<button
	type="button"
	on:click={async () => {
		data = await preloadData('/routing/preloading/error/500');
	}}>500</button
>

<p>{data.type} {data.status} {data.error?.message}</p>
