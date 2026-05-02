<script lang="ts">
	import { submit, get_result } from './form.remote.js';
</script>

<form
	{...submit.enhance(async ({ submit }) => {
		await submit();
	})}
>
	<input data-testid="checkbox" {...submit.fields.checkbox_field.as('checkbox')} />
	<button id="submit">Submit</button>
</form>

<p id="result">{get_result().current}</p>
