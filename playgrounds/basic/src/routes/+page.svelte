<script lang="ts">
	import { add_todo, add_todo_form, get_todos } from '$lib/todos.remote';

	const todos = $derived(get_todos());
</script>

<h1>Welcome to SvelteKit</h1>

<p><a href="images">images</a></p>
<p><a href="force-error">force error</a></p>

<h2>Todos</h2>

<h3>todo via JS</h3>
<input
	placeholder="Add Todo"
	onkeyup={async (e) => {
		if (e.key === 'Enter') {
			const value = (e.target as HTMLInputElement).value;
			await add_todo(value).updates(
				todos.withOverride((todos) => {
					return [...todos, { text: value }];
				})
			);
		}
	}}
/>

<h3>todo via form</h3>
<form {...add_todo_form}>
	<input name="text" placeholder="Add Todo" />
	<button type="submit">add</button>
</form>

<ul>
	{#await todos then todos}
		{#each todos as todo}
			<li>{todo.text}</li>
		{/each}
	{/await}
</ul>

<!-- with the await feature you could also do
<ul>
	{#each await todos as todo}
		<li>{todo.text}</li>
	{/each}
</ul>
and it would be reactive
-->
