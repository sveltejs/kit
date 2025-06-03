<script>
	import { task_one, task_two } from './form.remote.js';
</script>

<form {...task_one}>
	<input id="input-task" name="task" />
	<button id="submit-btn-one">Task One</button>
	<button id="submit-btn-two" {...task_two.formAction}>Task Two</button>
</form>

<form
	{...task_one.enhance(async ({ data, submit }) => {
		const task = data.get('task');
		if (task === 'abort') return;
		try {
			await submit();
		} catch {}
	})}
>
	<input id="input-task-enhance" name="task" />
	<button id="submit-btn-enhance-one">Task One (enhanced)</button>
	<button
		id="submit-btn-enhance-two"
		{...task_two.formAction.enhance(async ({ data, submit }) => {
			const task = data.get('task');
			if (task === 'abort') return;
			try {
				await submit();
			} catch {}
		})}>Task Two</button
	>
</form>

<p id="form-result-1">{task_one.result}</p>
<p id="form-result-2">{task_two.result}</p>

<p id="form-error-1">{task_one.error?.message}</p>
<p id="form-error-2">{task_two.error?.message}</p>

{#each ['foo', 'bar'] as item}
	<form {...task_one.for(item)}>
		<span id="form-result-{item}">{task_one.for(item).result}</span>
		<input name="task" value={item} />
		<button id="submit-btn-item-{item}">Task One for {item}</button>
	</form>
{/each}
