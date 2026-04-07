<!--
	Test fixture for mock.component.test.js.

	A minimal form component that exercises the key surfaces of a
	mocked remote form: field input props (.as), validation issues
	(.issues), and submission result (.result). Used to verify that
	mockRemote().withFieldValues() / .withFieldIssues() / .returns()
	flow through to rendered DOM correctly.
-->
<script>
	import { set_message } from '../src/routes/remote/form/[test_name]/form.remote.ts';
</script>

<form {...set_message}>
	<input {...set_message.fields.message.as('text')} />

	{#if set_message.fields.message.issues()}
		{#each set_message.fields.message.issues() as issue}
			<span class="error">{issue.message}</span>
		{/each}
	{/if}

	{#if set_message.result}
		<p class="result">{set_message.result}</p>
	{/if}

	<button>Submit</button>
</form>
