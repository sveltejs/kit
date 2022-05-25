<script>
	import Unused from './Unused.svelte';
	import './imported.css';
</script>

{#if Math.random() <= 1}
	<p class="shouty">this text is rendered</p>
{:else}
	<Unused />
{/if}

<style>
	p {
		color: #ff3e00;
	}
</style>
