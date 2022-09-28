<script>
	import { invalidateAll } from '$app/navigation';
	import { redirect_state } from '../state';

	function redirect() {
		redirect_state.set('start');
		invalidateAll();
	}
</script>

<button class="redirect" on:click={redirect}>redirect</button>
<p class="redirect-state">Redirect state: {$redirect_state}</p>
