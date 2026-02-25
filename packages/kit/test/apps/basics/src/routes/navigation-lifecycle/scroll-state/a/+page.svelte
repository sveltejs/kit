<script>
	import { beforeNavigate, onNavigate, afterNavigate } from '$app/navigation';

	beforeNavigate((navigation) => {
		console.log(
			'beforeNavigate:' +
				JSON.stringify({
					fromScroll: navigation.from?.scroll,
					toScroll: navigation.to?.scroll,
					type: navigation.type
				})
		);
	});

	onNavigate((navigation) => {
		console.log(
			'onNavigate:' +
				JSON.stringify({
					fromScroll: navigation.from?.scroll,
					toScroll: navigation.to?.scroll,
					type: navigation.type
				})
		);
	});

	afterNavigate((navigation) => {
		console.log(
			'afterNavigate:' +
				JSON.stringify({
					fromScroll: navigation.from?.scroll,
					toScroll: navigation.to?.scroll,
					type: navigation.type
				})
		);
	});
</script>

<h1>Page A</h1>

<div style="height: 100vh; background: linear-gradient(teal, cyan)"></div>

<a id="to-b" href="/navigation-lifecycle/scroll-state/b">Go to B</a>

<div style="height: 100vh; background: linear-gradient(cyan, blue)"></div>
