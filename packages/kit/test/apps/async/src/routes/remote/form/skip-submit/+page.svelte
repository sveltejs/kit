<script lang="ts">
	import { set_message } from './form.remote.ts';

	let should_submit = $state(false);

	const pendings_arr: number[] = [];
	const pendings = $derived.by(() => {
		pendings_arr.push(set_message.pending);
		return pendings_arr.join(', ');
	});
</script>

<label>
	<input type="checkbox" bind:checked={should_submit} data-should-submit />
	should submit
</label>

<form
	{...set_message.enhance(async ({ submit }) => {
		if (!should_submit) return;
		await submit();
	})}
>
	<button>submit</button>
</form>

<p data-pending>{pendings}</p>
