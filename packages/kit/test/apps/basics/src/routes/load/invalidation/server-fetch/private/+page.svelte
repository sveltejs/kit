<script>
	import { invalidate } from '$app/navigation';

	export let data;
</script>

<h1>Server Private Fetch</h1>

<p>Time: {new Date(data.time.datetime)}</p>

<p>
	<button on:click={e => invalidate('app:hidden-time-api')}>
		Fetch Current Time
	</button>
</p>
