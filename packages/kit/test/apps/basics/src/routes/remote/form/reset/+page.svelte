<script lang="ts">
	import { test } from './form.remote.js';
</script>

<form {...test.enhance(({ submit }) => submit())}>
	<input id="input" {...test.fields.value.as('text')} />
	<button type="submit" id="submit">Submit</button>
</form>

<button type="button" id="full-reset" onclick={() => test.reset()}>Reset</button>
<button
	type="button"
	id="partial-reset"
	onclick={() => test.reset({ issues: false, result: false })}>Partial Reset</button
>

<pre id="result">{JSON.stringify(test.result)}</pre>
<pre id="value">{JSON.stringify(test.fields.value.value())}</pre>
<pre id="allIssues">{JSON.stringify(test.fields.allIssues())}</pre>
