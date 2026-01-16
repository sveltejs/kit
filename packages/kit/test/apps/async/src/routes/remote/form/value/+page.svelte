<script>
	import { values } from './value.remote.js';
	const values_form = values();
</script>

<h1>Remote Form Value Test</h1>

<form {...values_form}>
	<label>
		Leaf:
		<input {...values_form.fields.leaf.as('text')} />
	</label>

	<label>
		Object Leaf:
		<input {...values_form.fields.object.leaf.as('text')} />
	</label>

	<label>
		Object Array 0:
		<input {...values_form.fields.object.array[0].as('text')} />
	</label>
	<label>
		Object Array 1:
		<input {...values_form.fields.object.array[1].as('text')} />
	</label>

	<label>
		Array 0 Leaf:
		<input {...values_form.fields.array[0].leaf.as('text')} />
	</label>
	<label>
		Array 1 Leaf:
		<input {...values_form.fields.array[1].leaf.as('text')} />
	</label>

	<button>Submit</button>
</form>

<h2>Full Form Value</h2>
<pre id="full-value">{JSON.stringify(values_form.fields.value(), null, '  ')}</pre>

<h2>Nested Object Value</h2>
<pre id="object-value">{JSON.stringify(values_form.fields.object.value(), null, '  ')}</pre>

<h2>Array Value</h2>
<pre id="array-value">{JSON.stringify(values_form.fields.array.value(), null, '  ')}</pre>
