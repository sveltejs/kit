<script>
	import { redirectForm } from './form.remote.ts';
</script>

<form {...redirectForm.for('blank')} target="_blank" data-testid="form-blank">
	<button type="submit">Submit blank</button>
</form>

<form {...redirectForm.for('same')} data-testid="form-same">
	<button type="submit">Submit same</button>
</form>
