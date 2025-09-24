<script>
	import { my_form } from './form.remote.js';
</script>

<form {...my_form}>
	<button name={my_form.field('submitter')} value="hello">submit</button>
</form>

<p id="result">{my_form.result}</p>
