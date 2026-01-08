<script lang="ts">
	import { getData } from './batch.remote.js';
</script>

<div id="csr_batch">
	{#each ['2026-01-01', '2025-12-01', '2025-11-01'] as d}
		<div>
			{await getData(d)}
		</div>
	{/each}
</div>
