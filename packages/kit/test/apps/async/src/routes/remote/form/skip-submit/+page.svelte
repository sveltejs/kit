<script>
	import { set_message } from './form.remote.ts';

	let should_submit = $state(false);

	const enhanced = set_message.for('enhanced');
</script>

<label>
	<input type="checkbox" bind:checked={should_submit} data-should-submit />
	should submit
</label>

<form
	{...enhanced.enhance(async ({ submit }) => {
		if (!should_submit) return;
		await submit();
	})}
>
	<button>submit</button>
</form>

<p data-pending>{enhanced.pending}</p>
