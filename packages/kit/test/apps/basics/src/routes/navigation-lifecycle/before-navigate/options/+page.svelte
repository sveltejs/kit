<script>
	import { beforeNavigate, goto } from '$app/navigation';

	let type;
	let options = {};
	beforeNavigate((nav) => {
		type = nav.type;
		options = nav.options;
		nav.cancel();
	});
</script>

<p>
	{type}
	{options.replaceState}
	{options.noScroll}
	{options.keepFocus}
	{options.invalidateAll}
	{JSON.stringify(options.state)}
</p>

<button
	on:click={() =>
		goto('/somewhere', {
			invalidateAll: true,
			noScroll: true,
			keepFocus: true,
			replaceState: true,
			state: { active: true }
		})}
>
	goto
</button>

<a href="/somewhere" data-sveltekit-keepfocus data-sveltekit-noscroll data-sveltekit-replacestate>
	link
</a>
