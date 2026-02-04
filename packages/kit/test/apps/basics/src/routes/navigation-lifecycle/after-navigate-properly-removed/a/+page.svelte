<script>
	import { afterNavigate } from '$app/navigation';

	afterNavigate(() => {
		console.log('after navigate called');

		/**
		 * @type {HTMLElement}
		 */
		const el = document.querySelector('.nav-lifecycle-after-nav-removed-test-target');

		if (el) {
			el.innerText = 'true';
		}
	});
</script>

<h1>/A</h1>
<a href="/navigation-lifecycle/after-navigate-properly-removed/a">/a</a>
<a href="/navigation-lifecycle/after-navigate-properly-removed/b">/b</a>
