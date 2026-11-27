<script>
	import { survey } from './form.remote';
</script>

<!-- unchecked checkboxes and unselected radios aren't submitted, leaving gaps in the arrays -->
<form {...survey}>
	<input {...survey.fields.name.as('text')} />

	{#each [0, 1, 2] as i}
		<input data-flag={i} {...survey.fields.flags[i].as('checkbox')} />
	{/each}

	{#each [0, 1] as i}
		{#each ['a', 'b'] as choice}
			<input data-answer="{i}-{choice}" {...survey.fields.answers[i].as('radio', choice)} />
		{/each}
	{/each}

	<button>submit</button>
</form>

<div id="result">{survey.result ?? 'none'}</div>
<div id="issue">{survey.fields.name.issues()?.[0]?.message ?? 'no issues'}</div>
