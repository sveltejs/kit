<script>
	import { total } from './data.remote.js';
</script>

<!-- TODO replace with inline await -->
{#await total() then t}
	<h1>{t}</h1>
{/await}
