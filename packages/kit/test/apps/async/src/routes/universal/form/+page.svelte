<script>
	import { add_todo, gate, get_todos } from '../universal.js';

	const todos = get_todos();

	const enhanced = add_todo.for('enhanced');
</script>

<ul id="todos">
	{#each await todos as todo}
		<li>{todo}</li>
	{/each}
</ul>

<form data-default {...add_todo}>
	<input {...add_todo.fields.text.as('text')} />
	<button>add</button>
</form>

<p id="issues">
	{add_todo.fields.text
		.issues()
		?.map((issue) => issue.message)
		.join(', ')}
</p>
<p id="result">
	{add_todo.result ? `${add_todo.result.added} (${add_todo.result.ran_on})` : 'none'}
</p>
<p id="pending">{add_todo.pending}</p>

<form
	data-enhanced
	{...enhanced.enhance(async (form) => {
		gate.close();
		const text = form.fields.text.value();
		await form.submit().updates(todos.withOverride((todos) => [...todos, `${text} (optimistic)`]));
	})}
>
	<input {...enhanced.fields.text.as('text')} />
	<button>add (enhanced)</button>
</form>

<p id="enhanced-result">
	{enhanced.result ? `${enhanced.result.added} (${enhanced.result.ran_on})` : 'none'}
</p>

<button id="open-gate" onclick={() => gate.open()}>open gate</button>
