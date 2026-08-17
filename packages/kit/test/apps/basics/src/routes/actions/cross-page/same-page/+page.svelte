<script>
	import { enhance } from '$app/forms';

	/** @type {any} */
	export let form;
	/** @type {any} */
	export let data;
</script>

<h1 class="same-page">same page</h1>

<pre class="load-search">{data.search}</pre>
<pre class="loaded-at">{data.loaded_at}</pre>
<pre class="form-json">{JSON.stringify(form ?? null)}</pre>

<form method="POST" action="?/del" use:enhance>
	<button class="submit-relative">Submit</button>
</form>

<form method="POST" action="?b=2&a=1&/del" use:enhance>
	<button class="submit-reordered">Submit</button>
</form>

<form method="POST" action="?/fail" use:enhance>
	<button class="submit-failure">Submit failure</button>
</form>

<form
	method="POST"
	action="?/fail"
	use:enhance={() =>
		async ({ update }) =>
			update({ refreshAll: true })}
>
	<button class="submit-failure-refresh">Submit failure and refresh</button>
</form>
