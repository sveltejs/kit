<script lang="ts">
	import { edit } from './form.remote.ts';
</script>

<form {...edit}>
	<input id="amount" {...edit.fields.amount.as('number', 200)} />
	<button id="reset" type="reset">reset</button>
</form>
<p id="value">{JSON.stringify(edit.fields.value())}</p>
