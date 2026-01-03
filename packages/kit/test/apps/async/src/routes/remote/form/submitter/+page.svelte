<script>
	import { my_form } from './form.remote.js';

	const my_form_form = my_form();
</script>

<form {...my_form_form}>
	<button {...my_form_form.fields.submitter.as('submit', 'hello')}>submit</button>
</form>

<p id="result">{my_form_form.result}</p>
