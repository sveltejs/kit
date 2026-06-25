<script>
	import { touched_form } from './touched.remote.js';
</script>

<p id="touched-name">Name touched: {touched_form.fields.name.touched()}</p>
<p id="touched-age">Age touched: {touched_form.fields.age.touched()}</p>

<button id="set-btn" type="button" onclick={() => touched_form.fields.name.set('example')}>
	set name programmatically
</button>

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
