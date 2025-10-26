<script lang="ts">
	import { set_message } from '../form.remote.js';
	import * as v from 'valibot';

	const message_form = set_message();

	const schema = v.object({
		message: v.picklist(
			['hello', 'goodbye', 'unexpected error', 'expected error', 'redirect'],
			'message is invalid'
		)
	});
</script>

<form {...message_form.preflight(schema)}>
	<label>
		<span>Message</span>
		<input {...message_form.fields.message.as('text')} />
	</label>

	<p id="issue">
		{message_form.fields.message.issues()?.[0]?.message ?? 'ok'}
	</p>
	<p id="value">{message_form.fields.message.value()}</p>

	<button
		id="set-and-validate"
		type="button"
		on:click={async () => {
			message_form.fields.message.set('hello');
			await message_form.validate({ includeUntouched: true });
		}}
	>
		Set & validate
	</button>
	<button>Submit</button>
</form>
