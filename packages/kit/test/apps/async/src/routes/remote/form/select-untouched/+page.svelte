<script>
	import { myform } from './form.remote.js';
</script>

<form {...myform}>
	<input {...myform.fields.message.as('text')} />

	<select {...myform.fields.number.as('select')}>
		<option>one</option>
		<option>two</option>
		<option>three</option>
	</select>

	<button>submit</button>
</form>
