<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<a href={resolve('/dynamic/[id]', { id: '1' })}>go to dynamic</a>
