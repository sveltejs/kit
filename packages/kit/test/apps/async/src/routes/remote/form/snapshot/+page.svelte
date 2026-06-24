<script>
	import { update, release } from './snapshot.remote.ts';

	let status = $state('idle');
	let captured = $state('none');
	let live = $state('none');
</script>

<form
	{...update.enhance(async (form) => {
		// take a snapshot of the fields *before* doing any async work
		const data = form.fields.value();

		// the submission is held open by the server, giving the test a window
		// to mutate the form state after the snapshot has been taken
		status = 'submitting';
		await form.submit();
		status = 'done';

		// the snapshot should reflect the values at the time it was taken, not
		// any changes to the form that happened post-submission
		captured = data.a.b.c;
		live = form.fields.a.b.c.value();
	})}
>
	<input {...update.fields.a.b.c.as('text')} />
	<button>submit</button>
</form>

<form {...release}>
	<button>release</button>
</form>

<p id="status">status: {status}</p>
<p id="captured">captured: {captured}</p>
<p id="live">live: {live}</p>
