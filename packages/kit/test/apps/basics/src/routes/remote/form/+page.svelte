<script>
	import { get_task, task_one, task_two, resolve_deferreds } from './form.remote.js';
	const current_task = get_task();
</script>

<!-- TODO use await here once async lands -->
<p id="get-task">{#await current_task then task}{task}{/await}</p>

<!-- Test pending state for forms -->
<p id="form-pending">Form pending: {task_one.pending}</p>
<p id="form-button-pending">Button pending: {task_two.buttonProps.pending}</p>

<form {...task_one}>
	<input id="input-task" name="task" />
	<button id="submit-btn-one">Task One</button>
	<button id="submit-btn-two" {...task_two.buttonProps}>Task Two</button>
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
		{...task_two.buttonProps.enhance(async ({ data, submit }) => {
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
		{...task_two.buttonProps.enhance(async ({ data, submit }) => {
			const task = data.get('task');
			await submit().updates(current_task.withOverride(() => task + ' (overridden)'));
		})}>Task Two (with override)</button
	>
</form>

<!-- Test case for button with nested elements (issue #14159) -->
<form
	{...task_one.enhance(async ({ data, submit }) => {
		const task = data.get('task');
		await submit();
	})}
>
	<input id="input-task-nested" name="task" />
	<button
		id="submit-btn-nested-span"
		{...task_two.buttonProps.enhance(async ({ data, submit }) => {
			const task = data.get('task');
			await submit();
		})}
	>
		<span>Task Two (nested span)</span>
	</button>
</form>

<p id="form-result-1">{task_one.result}</p>
<p id="form-result-2">{task_two.result}</p>

<form {...resolve_deferreds}>
	<button id="resolve-deferreds" type="submit">Resolve Deferreds</button>
</form>

{#each ['foo', 'bar'] as item}
	<form {...task_one.for(item)}>
		<span id="form-result-{item}">{task_one.for(item).result}</span>
		<input name="task" value={item} />
		<button id="submit-btn-item-{item}">Task One for {item}</button>
	</form>
{/each}

<form {...task_two.for('foo')}>
	<span id="form-result-2-foo">{task_two.for('foo').result}</span>
	<input name="task" value="foo2" />
	<button id="submit-btn-item-2-foo">Task Two for foo</button>
</form>
