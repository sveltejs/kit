<script>
	import { my_form } from './form.remote.js';
</script>

<form {...my_form}>
	<button {...my_form.fields.submitter.as('submit', 'hello')}>submit</button>
</form>

<p id="result">{my_form.result}</p>
