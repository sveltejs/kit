<script>
	import { my_form } from './form.remote.js';
</script>

<form {...my_form} oninput={() => my_form.validate()}>
	{#if my_form.issues.foo}
		<p>{my_form.issues.foo[0].message}</p>
	{/if}

	<input name="foo" />

	{#if my_form.issues.bar}
		<p>{my_form.issues.bar[0].message}</p>
	{/if}

	<input name="bar" />

	<button>submit</button>
</form>
