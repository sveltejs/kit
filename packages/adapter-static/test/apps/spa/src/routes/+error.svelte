<script>
	import { browser } from '$app/env';
	import { page, session } from '$app/stores';

	if (browser) {
		$session.count += 1;
	}
</script>

<h1>{$page.status}</h1>
<h2>count: {$session.count}</h2>

<button on:click={() => ($session.count += 1)}>+1</button>
