<script>
	import { page } from '$app/state';
	import { batch_go_home, go_home, guard } from '../data.remote.js';

	await (page.params.kind === 'batch'
		? batch_go_home('a')
		: page.params.kind === 'error'
			? guard()
			: go_home());
</script>

<h1 id="protected-content">Protected content</h1>
