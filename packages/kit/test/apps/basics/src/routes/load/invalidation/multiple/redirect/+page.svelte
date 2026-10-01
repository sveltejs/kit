<script>
	import { refreshAll } from '$app/navigation';
	import { redirect_state } from '../state';

	function redirect() {
		redirect_state.set('start');
		refreshAll();
	}
</script>

<button class="redirect" onclick={redirect}>redirect</button>
<p class="redirect-state">Redirect state: {$redirect_state}</p>
