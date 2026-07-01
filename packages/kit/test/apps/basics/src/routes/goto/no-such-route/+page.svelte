<script>
	import { goto } from '$app/navigation';

	let message = $state('...');
</script>

<button
	onclick={async () => {
		try {
			await goto('/this-route-does-not-exist');
		} catch (e) {
			message = e instanceof Error ? e.message : 'unknown error message';
		}
	}}>goto</button
>

<p>{message}</p>
