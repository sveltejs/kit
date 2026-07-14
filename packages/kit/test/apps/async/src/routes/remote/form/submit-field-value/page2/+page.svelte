<script lang="ts">
	import { my_form } from '../form.remote.ts';

	let captured = $state<number | null>(null);

	my_form.enhance(async ({ fields, submit }) => {
		// the submit field's value should already reflect the clicked button
		captured = fields.quantity.value()!;
		await submit();
	});
</script>

<form {...my_form}>
	<input id="input" {...my_form.fields.quantity.as('number')} />
	<button id="submit" type="submit">submit</button>
</form>

<p id="captured">{captured}</p>
<p id="result">{my_form.result}</p>
