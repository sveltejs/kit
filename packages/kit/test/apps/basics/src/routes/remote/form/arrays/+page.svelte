<script>
	import { my_form } from './form.remote.js';

	my_form.fields.set({
		strings: [],
		numbers: [],
		objects: []
	});

	my_form.fields.strings.push('');
	my_form.fields.numbers.push(0);
	my_form.fields.objects.push({ name: '', age: 0 });
</script>

<form {...my_form}>
	{#each my_form.fields.strings.value() as _, i (i)}
		<div>
			<label>
				String {i + 1}
				<input {...my_form.fields.strings[i].as('text')} />
			</label>
		</div>
	{/each}

	{#each my_form.fields.numbers.value() as _, i (i)}
		<div>
			<label>
				Number {i + 1}
				<input {...my_form.fields.numbers[i].as('number')} />
			</label>
		</div>
	{/each}

	{#each my_form.fields.objects.value() as _, i (i)}
		<div>
			<label>
				Object {i + 1} Name
				<input {...my_form.fields.objects[i].name.as('text')} />
			</label>
			<label>
				Object {i + 1} Age
				<input {...my_form.fields.objects[i].age.as('number')} />
			</label>
		</div>
	{/each}

	<button>Submit</button>
</form>

<h2>Full Form Value</h2>
<pre id="full-value">{JSON.stringify(my_form.fields.value(), null, 2)}</pre>
