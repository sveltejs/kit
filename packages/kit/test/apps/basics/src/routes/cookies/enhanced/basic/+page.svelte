<script>
	import { enhance } from '$app/forms';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

Cookie: <span id="cookie-value">{`${data.cookie}`}</span>

<form method="post" action="?/setTeapot" use:enhance>
	<button id="teapot">Set cookie to "teapot"</button>
</form>

<form method="post" action="?/setJaneAusten" use:enhance>
	<button id="janeAusten">Set cookie to "Jane Austen"</button>
</form>

<form method="post" action="?/delete" use:enhance>
	<button id="delete">Delete cookie</button>
</form>
