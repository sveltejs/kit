<script lang="ts">
	import { reverse } from './batch.remote.js';

	let phrase = $state('ecrof eht esu');
	const words = $derived(phrase.split(' ').reverse());
</script>

<div id="phrase">
	{#each words as word, i}
		{await reverse(word)}{i === words.length - 1 ? '' : ' '}
	{/each}
</div>
<button onclick={() => (phrase = 'rehtaf ruoy ma i')}>get dramatic</button>
