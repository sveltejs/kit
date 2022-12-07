<script>
	import { onMount } from 'svelte';
	import { increment, count } from '../state.js';

	onMount(increment);
</script>

<h2>source: {count}</h2>
