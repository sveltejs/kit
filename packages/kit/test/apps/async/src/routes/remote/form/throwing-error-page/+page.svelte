<script>
	import { set_message } from '../[test_name]/form.remote.ts';
</script>

<form {...set_message}>
	<input {...set_message.fields.message.as('text')} />
	<input {...set_message.fields.test_name.as('hidden', 'throwing-error-page')} />

	<button {...set_message.fields.action.as('submit', 'normal')}>set message</button>
</form>
