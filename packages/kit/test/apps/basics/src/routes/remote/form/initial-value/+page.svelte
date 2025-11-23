<script>
	import { values } from './value.remote.js';
	const fields = values.fields;
	const initial_value = $state({ val: 'initial' });
	fields.set(initial_value);
</script>

<h1>Remote Form Initial Value Test</h1>

<pre id="initial">Initial: {JSON.stringify(initial_value)}</pre>
<pre id="value">Value: {JSON.stringify(fields.value())}</pre>
