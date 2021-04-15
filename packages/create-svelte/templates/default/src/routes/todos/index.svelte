<script context="module" lang="ts">
	import type { Load } from '@sveltejs/kit';

	export const load: Load = async ({ fetch }) => {
		// TODO implement endpoint
		return {
			props: {
				todos: [{
					text: 'implement an endpoint so that this actually works',
					done: false
				}]
			}
		};
	}
</script>

<script lang="ts">
	type Todo = {
		text: string;
		done: boolean;
	};

	export let todos: Todo[];
</script>

<svelte:head>
	<title>TODOs</title>
</svelte:head>

<h1>TODOs</h1>

{#each todos as todo}
	<p>{todo.text}</p>
{/each}