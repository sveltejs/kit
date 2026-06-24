<script lang="ts">
	import { my_form } from './form.remote.ts';

	let captured = $state('');

	my_form.enhance(async ({ fields, submit }) => {
		// the submit field's value should already reflect the clicked button
		captured = fields.action.value()!;
		await submit();
	});
</script>

<form {...my_form}>
	<button id="save" {...my_form.fields.action.as('submit', 'save')}>save</button>
	<button id="delete" {...my_form.fields.action.as('submit', 'delete')}>delete</button>
</form>

<p id="captured">{captured}</p>
<p id="result">{my_form.result}</p>
