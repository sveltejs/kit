<script lang="ts">
	import { load } from '$app/state';
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import { add, multiply, multiply2, divide } from '$lib/foo.remote.ts';
	import { add_todo, add_todo_form, get_todos } from '$lib/todos.remote';
	import { invalidate } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	let todos = load(({ depends }) => {
		// depends('to:dos');
		return get_todos();
	});
	// single flight
	// deps at declaration site (depends/invalidate on server)
	// use:enhance could work by inspecting header and wrapping it
</script>

<h1>Welcome to SvelteKit</h1>

<div>From load fn: {data.sum}</div>

<button
	onclick={async () => {
		const result = await add(2, 3);
		console.log(result);
	}}>add</button
>

<button
	onclick={async () => {
		const result = await multiply(2, 3);
		console.log(result);
	}}>multiply</button
>

<form {...divide.form}>
	<input name="a" value="2" />
	<input name="b" value="1" />
	<button>divide ({divide.result})</button>
	<button {...multiply2.formAction}>multiply2 ({multiply2.result})</button>
</form>

<hr />

<h2>Todos</h2>

<input
	placeholder="Add Todo"
	onkeyup={async (e) => {
		if (e.key === 'Enter') {
			todos.data = [...todos, { text: e.target.value }];
			await add_todo(e.target.value);
			// invalidate('to:dos');
		}
	}}
/>

<form method="post" action={add_todo_form} use:enhance>
	<input name="text" placeholder="Add Todo" />
	<button type="submit">add</button>
</form>

<ul>
	{#each todos.data ?? [] as todo}
		<li>{todo.text}</li>
	{/each}
</ul>
