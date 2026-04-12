<script>
	import { test_form } from './form.remote';
</script>

<form {...test_form}>
	<p id="default-value-display">{test_form.fields.name.value()}</p>
	<input
		data-testid="as-value-default-input"
		{...test_form.fields.name.as('text', 'default text')}
	/>
</form>
