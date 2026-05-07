<script lang="ts">
	import { reset_form } from './form.remote';
</script>

<form {...reset_form}>
	<button id="return" {...reset_form.fields.action.as('submit', 'return')}>Return</button>
	<button id="redirect" {...reset_form.fields.action.as('submit', 'redirect')}>Redirect</button>
</form>

<div id="result">{reset_form.result}</div>
