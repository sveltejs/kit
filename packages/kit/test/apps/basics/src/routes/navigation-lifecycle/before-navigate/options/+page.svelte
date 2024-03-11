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
	{options.noScroll}
	{options.keepFocus}
	{options.replaceState}
	{options.invalidateAll}
	{JSON.stringify(options.state)}
</p>

<button
	on:click={() =>
		goto('/somewhere', {
			noScroll: true,
			keepFocus: true,
			replaceState: true,
			invalidateAll: true,
			state: { active: true }
		})}
>
	goto
</button>

<a href="/somewhere" data-sveltekit-noscroll data-sveltekit-keepfocus data-sveltekit-replacestate>
	link
</a>
