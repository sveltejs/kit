<script>
	import { onMount } from 'svelte';

	/** @type {HTMLDivElement} */
	let elem;

	onMount(() => {
		const shadow = elem.attachShadow({ mode: 'open' });
		const anchor = document.createElement('a');
		anchor.href = '/routing/a';
		anchor.innerHTML = '<slot>';
		shadow.appendChild(anchor);
	});
</script>

<div bind:this={elem}>
	<div id="clickme">Hello world</div>
</div>
