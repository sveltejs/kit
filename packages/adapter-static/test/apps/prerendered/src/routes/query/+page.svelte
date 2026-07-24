<script>
	import { not_allowed } from './remote';

	const str = $derived(await not_allowed());
</script>

<p>{str}</p>
