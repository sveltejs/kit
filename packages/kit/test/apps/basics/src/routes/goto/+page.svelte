<script>
	import { goto } from '$app/navigation';

	let message = '...';
</script>

<button
	on:click={async () => {
		try {
			await goto('https://example.com');
		} catch (e) {
			message = e instanceof Error ? e.message : 'unknown error message';
		}
	}}>goto</button
>

<p>{message}</p>
