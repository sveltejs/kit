<script>
	import { enhance } from '$app/forms';
	/** @type {import('./$types').PageData} */
	export let data;
</script>

Cookie: <span id="cookie-value">
	{JSON.stringify(data.cookie)}
</span>

<br />
Trying to debug test:
<pre> 
{JSON.stringify(data)}
</pre>

<form method="post" action="?/setTeapot" use:enhance>
	<p>
		<button id="teapot" type="submit">Set cookie to "teapot"</button>
	</p>
</form>

<form method="post" action="?/setJaneAusten" use:enhance>
	<p>
		<button id="janeAusten" type="submit">Set cookie to "Jane Austen"</button>
	</p>
</form>

<form method="post" action="?/delete" use:enhance>
	<p>
		<button id="delete" type="submit">Delete cookie</button>
	</p>
</form>
