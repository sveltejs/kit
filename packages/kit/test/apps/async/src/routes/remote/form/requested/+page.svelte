<script>
	import { submit } from './form.remote.ts';
</script>

<form {...submit}>
	<button id="requested-submit">Submit</button>
</form>

<p id="form-result">{submit.result?.message ?? 'not submitted'}</p>
