<script>
	import { afterNavigate } from '$app/navigation';

	/** @type {string[]} */
	const order = $state([]);

	/** @type {import('./$types').Snapshot<void>} */
	export const snapshot = {
		capture: () => {},
		restore: () => {
			order.push('restore');
		}
	};

	afterNavigate(() => {
		order.push('afterNavigate');
	});
</script>

<p data-testid="order">{order.join(',')}</p>
