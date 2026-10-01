<script>
	import { enhance } from '$app/forms';

	/** @type {any} */
	export let form;
	/** @type {any} */
	export let data;
</script>

<h1 class="source">source</h1>

<pre class="source-form">{JSON.stringify(form ?? null)}</pre>
<pre class="layout-loaded-at">{data.layout_loaded_at}</pre>

<!-- enhanced forms, one per result type -->
<form method="POST" action="/actions/cross-page/destination?/success" use:enhance>
	<input class="username-success" name="username" type="text" value="paolo" />
	<button class="submit-success">Submit</button>
</form>

<form method="POST" action="/actions/cross-page/destination?/failure" use:enhance>
	<input class="username-failure" name="username" type="text" value="paolo" />
	<button class="submit-failure">Submit</button>
</form>

<form method="POST" action="/actions/cross-page/destination?/redirect" use:enhance>
	<button class="submit-redirect">Submit</button>
</form>

<form method="POST" action="/actions/cross-page/destination?throw-in-load&/error" use:enhance>
	<button class="submit-error">Submit</button>
</form>

<!-- unenhanced copies, so that the no-JS runs exercise the same fixtures -->
<form method="POST" action="/actions/cross-page/destination?/success">
	<input class="username-native-success" name="username" type="text" value="paolo" />
	<button class="native-success">Submit</button>
</form>

<form method="POST" action="/actions/cross-page/destination?/failure">
	<input class="username-native-failure" name="username" type="text" value="paolo" />
	<button class="native-failure">Submit</button>
</form>

<form method="POST" action="/actions/cross-page/destination?/redirect">
	<button class="native-redirect">Submit</button>
</form>

<form method="POST" action="/actions/cross-page/destination?throw-in-load&/error">
	<button class="native-error">Submit</button>
</form>

<!-- action carrying an extra param: only `?/success` is stripped -->
<form
	method="POST"
	action="/actions/cross-page/destination?redirectTo=%2Fdashboard&/success"
	use:enhance
>
	<input class="username-extra" name="username" type="text" value="paolo" />
	<button class="submit-extra-params">Submit</button>
</form>

<!-- escape hatches: stay on this page and apply the result here -->
<form
	method="POST"
	action="/actions/cross-page/destination?/failure"
	use:enhance={() =>
		async ({ update }) =>
			update({ navigate: false })}
>
	<input class="username-stay" name="username" type="text" value="paolo" />
	<button class="submit-stay">Submit</button>
</form>

<form
	method="POST"
	action="/actions/cross-page/destination?/redirect"
	use:enhance={() =>
		async ({ update }) =>
			update({ navigate: false })}
>
	<button class="submit-redirect-stay">Submit redirect</button>
</form>
