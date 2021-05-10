<script>
	import { amp } from '$app/env';
	import Unused from './Unused.svelte';
	import './imported.css';
</script>

{#if amp}
	<p class="shouty">this text is rendered</p>
{:else}
	<Unused/>
{/if}


<style>
	p {
		color: turquoise;
	}
</style>
