<script lang="ts">
	import { set_message } from '../[test_name]/form.remote.js';
	import * as v from 'valibot';

	const schema = v.object({
		test_name: v.string(),
		message: v.picklist(
			['hello', 'goodbye', 'unexpected error', 'expected error', 'redirect'],
			'message is invalid'
		)
	});
	const message_form = set_message({
		preflight: schema
	});
</script>

<form {...message_form}>
	<label>
		<span>Message</span>
		<input {...message_form.fields.message.as('text')} />
		<input {...message_form.fields.test_name.as('hidden', 'imperative')} />
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
