<script>
	import { add_todo, get_todos } from './devtools.remote.js';

	const todos = get_todos();
</script>

<ul id="todos">
	{#each await todos as todo}
		<li>{todo}</li>
	{/each}
</ul>

<button
	id="add"
	onclick={() =>
		add_todo('Walk the dog').updates(
			todos.withOverride((current) => [...current, 'Walk the dog (pending)'])
		)}
>
	add
</button>
