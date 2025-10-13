<script>
	import { values } from './value.remote.js';
</script>

<h1>Remote Form Set Test</h1>

<form {...values}>
	<label>
		Leaf:
		<input {...values.fields.leaf.as('text')} />
	</label>

	<button>Submit</button>
</form>

<h2>Full Form Value</h2>
<pre id="full-value">{JSON.stringify(values.fields.value(), null, '  ')}</pre>

<button id="update-value" onclick={() => values.fields.leaf.set('new value')}>Update Value</button>
