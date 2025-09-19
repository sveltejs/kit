<script>
	import { values } from './value.remote.js';
</script>

<h1>Remote Form Value Test</h1>

<form {...values}>
	<label>
		Leaf:
		<input name="leaf" value={values.fields.leaf.value()} />
	</label>

	<label>
		Object Leaf:
		<input name="object.leaf" value={values.fields.object.leaf.value()} />
	</label>

	<label>
		Object Array 0:
		<input name="object.array[]" value={values.fields.object.array[0].value()} />
	</label>
	<label>
		Object Array 1:
		<input name="object.array[]" value={values.fields.object.array[1].value()} />
	</label>

	<label>
		Array 0 Leaf:
		<input name="array[0].leaf" value={values.fields.array[0].leaf.value()} />
	</label>
	<label>
		Array 1 Leaf:
		<input name="array[1].leaf" value={values.fields.array[1].leaf.value()} />
	</label>

	<button>Submit</button>
</form>

<h2>Full Form Value</h2>
<pre id="full-value">{JSON.stringify(values.fields.value(), null, '  ')}</pre>

<h2>Nested Object Value</h2>
<pre id="object-value">{JSON.stringify(values.fields.object.value(), null, '  ')}</pre>

<h2>Array Value</h2>
<pre id="array-value">{JSON.stringify(values.fields.array.value(), null, '  ')}</pre>
