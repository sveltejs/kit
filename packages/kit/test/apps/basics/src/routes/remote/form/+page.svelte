<script>
	import { get_task, task_one, task_two } from './form.remote.js';
	const current_task = get_task();
</script>

<!-- TODO use await here once async lands -->
<p id="get-task">{#await current_task then task}{task}{/await}</p>

<form {...task_one}>
	<input id="input-task" name="task" />
	<button id="submit-btn-one">Task One</button>
	<button id="submit-btn-two" {...task_two.formAction}>Task Two</button>
</form>

<form
	{...task_one.enhance(async ({ data, submit }) => {
		const task = data.get('task');
		if (task === 'abort') return;
		await submit();
	})}
>
	<input id="input-task-enhance" name="task" />
	<button id="submit-btn-enhance-one">Task One (enhanced)</button>
	<button
		id="submit-btn-enhance-two"
		{...task_two.formAction.enhance(async ({ data, submit }) => {
			const task = data.get('task');
			if (task === 'abort') return;
			await submit();
		})}>Task Two (enhanced)</button
	>
</form>

<form
	{...task_one.enhance(async ({ data, submit }) => {
		const task = data.get('task');
		await submit().updates(current_task.withOverride(() => task + ' (overridden)'));
	})}
>
	<input id="input-task-override" name="task" />
	<button id="submit-btn-override-one">Task One (with override)</button>
	<button
		id="submit-btn-override-two"
		{...task_two.formAction.enhance(async ({ data, submit }) => {
			const task = data.get('task');
			await submit().updates(current_task.withOverride(() => task + ' (overridden)'));
		})}>Task Two (with override)</button
	>
</form>

<p id="form-result-1">{task_one.result}</p>
<p id="form-result-2">{task_two.result}</p>

{#each ['foo', 'bar'] as item}
	<form {...task_one.for(item)}>
		<span id="form-result-{item}">{task_one.for(item).result}</span>
		<input name="task" value={item} />
		<button id="submit-btn-item-{item}">Task One for {item}</button>
	</form>
{/each}
