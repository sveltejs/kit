<script>
	import { touched_form } from './touched.remote.js';
	import { tick } from 'svelte';

	const markNameTouched = async () => {
		touched_form.fields.name.set('example');
		await tick();
	};
</script>

<h1>Remote Form Touched Test</h1>

<p id="touched-name">Name touched: {touched_form.fields.name.touched() ? 'yes' : 'no'}</p>
<p id="touched-age">Age touched: {touched_form.fields.age.touched() ? 'yes' : 'no'}</p>

<button id="set-btn" type="button" on:click={markNameTouched}> set name programmatically </button>

<form {...touched_form}>
	<label>
		Name
		<input id="name-input" {...touched_form.fields.name.as('text')} />
	</label>

	<label>
		Age
		<input id="age-input" {...touched_form.fields.age.as('number')} />
	</label>

	<button id="reset-btn" type="reset">Reset</button>
</form>
