<script>
	import { onMount } from 'svelte';
	import { echo } from './form.remote';

	// a key with a space forces the encoded (server) and raw (client) id conventions to diverge
	const keyed = echo.for('a b');

	let hydrated = $state(false);

	onMount(() => {
		hydrated = true;
	});
</script>

<div id="hydrated">{hydrated}</div>
<div id="result">{echo.result ?? 'none'}</div>
<div id="issue">{echo.fields.message.issues()?.[0]?.message ?? 'no issues'}</div>
<div id="keyed-result">{keyed.result ?? 'none'}</div>

<!-- deliberately not enhanced: action/method only, so submission is a native full-page POST -->
<form id="plain" action={echo.action} method="POST">
	<input {...echo.fields.message.as('text')} />
	<button type="submit">Submit</button>
</form>

<form id="keyed" action={keyed.action} method="POST">
	<input {...keyed.fields.message.as('text')} />
	<button type="submit">Submit</button>
</form>
