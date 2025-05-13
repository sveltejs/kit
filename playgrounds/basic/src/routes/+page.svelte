<script lang="ts">
	import { load } from '$app/state';
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import { add, multiply, multiply2, divide } from '$lib/foo.remote.ts';
	import { add_todo, add_todo_form, get_todos, get_todos_cached } from '$lib/todos.remote';
	import { invalidate } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	let todos = load(() => {
		return get_todos();
	});
	let todos_cache = load(() => {
		console.log('load get_todos_cached');
		return get_todos_cached();
	});
	// single flight
	// deps at declaration site (depends/invalidate on server)
	// use:enhance could work by inspecting header and wrapping it
</script>

<h1>Welcome to SvelteKit</h1>

<div>From load fn: {data.sum}</div>
<div>From todos cache: {JSON.stringify(todos_cache.data)}</div>

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

<!-- <form {...divide.form}>
	<input name="a" value="2" />
	<input name="b" value="1" />
	<button>divide ({divide.result})</button>
	<button {...multiply2.formAction}>multiply2 ({multiply2.result})</button>
</form> -->

<hr />

<h2>Todos</h2>

<h3>todo via JS</h3>
<input
	placeholder="Add Todo"
	onkeyup={async (e) => {
		if (e.key === 'Enter') {
			// todos.data = [...todos.data, { text: e.target.value }];
			get_todos.override([], (todos) => {
				return [...todos, { text: e.target.value }];
			});
			await add_todo(e.target.value);
			get_todos.refresh();
		}
	}}
/>

<h3>todo via form</h3>
<form {...add_todo_form}>
	<input name="text" placeholder="Add Todo" />
	<button type="submit">add</button>
</form>
<form
	{...add_todo_form.enhance(async ({ submit }) => {
		console.log('hey there');
		const result = await submit();
		console.log(result);
	})}
>
	<input name="text" placeholder="Add Todo enhanced" />
	<button type="submit">add</button>
</form>
<form>
	<input name="text" placeholder="Add Todo through formAction on button" />
	<button {...add_todo_form.formAction}>add</button>
</form>
<!-- <form method="post" action={add_todo_form} use:enhance>
	<input name="text" placeholder="Add Todo" />
	<button type="submit">add</button>
</form> -->

<ul>
	{#each todos.data ?? [] as todo}
		<li>{todo.text}</li>
	{/each}
</ul>

<!-- with the await feature you could also do
<ul>
	{#each await get_todos() as todo}
		<li>{todo.text}</li>
	{/each}
</ul>
and it would be reactive
-->
