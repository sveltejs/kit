<script>
	import { onMount } from 'svelte';
	import { increment, count } from '../state.js';

	onMount(increment);
</script>

<h1>source: {count}</h1>
