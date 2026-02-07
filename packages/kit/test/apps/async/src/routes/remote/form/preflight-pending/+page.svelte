<script>
	import { create } from './form.remote.js';
	import * as v from 'valibot';

	const passing_schema = v.pipeAsync(
		v.object({
			name: v.string()
		}),
		v.checkAsync(async () => {
			await new Promise((resolve) => setTimeout(resolve, 500));
			return true;
		}, 'async check failed')
	);

	const failing_schema = v.pipeAsync(
		v.object({
			name: v.string()
		}),
		v.checkAsync(async () => {
			await new Promise((resolve) => setTimeout(resolve, 500));
			return false;
		}, 'async check failed')
	);

	const passing = create.for('passing');
	const failing = create.for('failing');
</script>

<form data-passing {...passing.preflight(passing_schema)}>
	<input {...passing.fields.name.as('text')} value="test" />
	<button>submit passing</button>
</form>
<p data-passing-pending>passing pending: {passing.pending}</p>
<p data-passing-result>passing result: {passing.result}</p>

<hr />

<form data-failing {...failing.preflight(failing_schema)}>
	<input {...failing.fields.name.as('text')} value="test" />
	<button>submit failing</button>
</form>
<p data-failing-pending>failing pending: {failing.pending}</p>
{#each failing.fields.allIssues() as issue}
	<p data-failing-issue>{issue.message}</p>
{/each}
