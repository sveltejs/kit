<script>
	import { error } from '@sveltejs/kit';

	async function load() {
		error(404, 'nope');
	}
</script>

{await load()}
