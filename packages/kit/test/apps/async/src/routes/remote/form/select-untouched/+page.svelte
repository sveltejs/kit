<script>
	import { myform } from './form.remote.js';

	const myform_form = myform();
</script>

<form {...myform_form}>
	<input {...myform_form.fields.message.as('text')} />

	<select {...myform_form.fields.number.as('select')}>
		<option>one</option>
		<option>two</option>
		<option>three</option>
	</select>

	<button>submit</button>
</form>
