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
		const { type, apply } = await submit();
		if (type !== 'error') {
			apply();
		}
	})}
>
	<input id="input-task-enhance" name="task" />
	<button id="submit-btn-enhance-one">Task One (enhanced)</button>
	<button
		id="submit-btn-enhance-two"
		{...task_two.formAction.enhance(async ({ data, submit }) => {
			const task = data.get('task');
			if (task === 'abort') return;
			const { type, apply } = await submit();
			if (type !== 'error') {
				apply();
			}
		})}>Task Two</button
	>
</form>

<p id="form-result-1">
	{typeof task_one.result === 'string' ? task_one.result : task_one.result?.message}
</p>
<p id="form-result-2">
	{typeof task_two.result === 'string' ? task_two.result : task_two.result?.message}
</p>

<p id="form-error-1">{task_one.error?.message}</p>
<p id="form-error-2">{task_two.error?.message}</p>

{#each ['foo', 'bar'] as item}
	<form {...task_one.for(item)}>
		<span id="form-result-{item}">{task_one.for(item).result}</span>
		<input name="task" value={item} />
		<button id="submit-btn-item-{item}">Task One for {item}</button>
	</form>
{/each}
