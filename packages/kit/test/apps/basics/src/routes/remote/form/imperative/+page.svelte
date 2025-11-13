<script lang="ts">
	import { set_message } from '../form.remote.js';
	import * as v from 'valibot';

	const schema = v.object({
		message: v.picklist(
			['hello', 'goodbye', 'unexpected error', 'expected error', 'redirect'],
			'message is invalid'
		)
	});
</script>

<form {...set_message.preflight(schema)}>
	<label>
		<span>Message</span>
		<input {...set_message.fields.message.as('text')} />
	</label>

	<p id="issue">
		{set_message.fields.message.issues()?.[0]?.message ?? 'ok'}
	</p>
	<p id="value">{set_message.fields.message.value()}</p>

	<button
		id="set-and-validate"
		type="button"
		on:click={async () => {
			set_message.fields.message.set('hello');
			await set_message.validate({ includeUntouched: true });
		}}
	>
		Set & validate
	</button>
	<button>Submit</button>
</form>
