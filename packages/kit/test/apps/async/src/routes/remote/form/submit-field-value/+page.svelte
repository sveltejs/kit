<script lang="ts">
	import { my_form } from './form.remote.ts';

	let captured = $state<number | null>(null);

	my_form.enhance(async ({ fields, submit }) => {
		// the submit field's value should already reflect the clicked button
		captured = fields.quantity.value()!;
		await submit();
	});
</script>

<a href="/remote/form/submit-field-value/page2">Page 2</a>

<form {...my_form}>
	<button id="one" {...my_form.fields.quantity.as('submit', 1)}>1</button>
	<button id="five" {...my_form.fields.quantity.as('submit', 5)}>5</button>
	<button id="no-value" type="submit">no value</button>
</form>

<p id="captured">{captured}</p>
<p id="result">{my_form.result}</p>
