<script>
	import { read, read_batch, read_live, read_prerender, mutate, submit } from './data.remote.js';

	let result = $state('idle');
</script>

<p id="ssr-result">{await read()}</p>
<p id="fetch-result">{result}</p>
<button
	id="read"
	onclick={async () => {
		await read().refresh();
		result = await read();
	}}>query</button
>
<button
	id="read_batch"
	onclick={async () => {
		result = await read_batch('key');
	}}>batch</button
>
<button
	id="read_live"
	onclick={async () => {
		result = await read_live();
	}}>live</button
>
<button
	id="read_prerender"
	onclick={async () => {
		result = await read_prerender('runtime');
	}}>prerender</button
>
<button
	id="mutate"
	onclick={async () => {
		result = await mutate();
	}}>command</button
>
<form {...submit}>
	<button>form</button>
	<p id="form-result">{submit.result}</p>
</form>
