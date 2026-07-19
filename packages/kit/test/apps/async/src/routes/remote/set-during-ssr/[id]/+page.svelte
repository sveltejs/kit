<script>
	import { get_item } from '../set-during-ssr.remote.js';

	const { params } = $props();
</script>

<div id="item">{await get_item(params.id)}</div>
