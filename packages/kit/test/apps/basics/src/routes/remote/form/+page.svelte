<script>
	import { add_one, add_two } from './form.remote.js';
</script>

<form {...add_one}>
	<input id="input-n" name="n" type="number" />
	<button id="submit-btn-one" type="submit">Add One</button>
	<button id="submit-btn-two" type="submit" {...add_two.formAction}>Add Two</button>
</form>

<form
	{...add_one.enhance(async ({ formData, submit }) => {
		const n = parseInt(formData.get('n'), 10);
		if (n > 5) return;
		await submit();
	})}
>
	<input id="input-n-enhance" name="n" type="number" />
	<button id="submit-btn-enhance-one" type="submit">Add One (enhanced)</button>
	<button
		id="submit-btn-enhance-two"
		type="submit"
		{...add_two.formAction.enhance(async ({ formData, submit }) => {
			const n = parseInt(formData.get('n'), 10);
			if (n > 5) return;
			await submit();
		})}>Add Two</button
	>
</form>

<p id="form-result-1">{add_one.result}</p>
<p id="form-result-2">{add_two.result}</p>
