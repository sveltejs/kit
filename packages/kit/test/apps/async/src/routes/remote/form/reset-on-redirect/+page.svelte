<script lang="ts">
	import { redirect_form, reset_form } from './form.remote';

	redirect_form.enhance(async ({ submit }) => {
		await submit();
		sessionStorage.setItem('submit-resolved-pathname', location.pathname);
	});
</script>

<form {...reset_form}>
	<button id="return" {...reset_form.fields.action.as('submit', 'return')}>Return</button>
	<button id="redirect" {...reset_form.fields.action.as('submit', 'redirect')}>Redirect</button>
</form>

<div id="result">{reset_form.result}</div>

<form {...redirect_form}>
	<button id="redirect-other">Redirect to another page</button>
</form>
