<script>
	let x = 0;
</script>

<a id="one" href="/data-sveltekit/preload-data/target" data-sveltekit-preload-data>one</a>

<div data-sveltekit-preload-data>
	<a id="two" href="/data-sveltekit/preload-data/target">two</a>
	<a id="three" href="/data-sveltekit/preload-data/target" data-sveltekit-preload-data="off"
		>three</a
	>
</div>

<a id="tap" href="/data-sveltekit/preload-data/target" data-sveltekit-preload-data="tap">tap</a>

<a
	id="hover-then-tap"
	href="/data-sveltekit/preload-data/target"
	data-sveltekit-preload-code="hover"
	data-sveltekit-preload-data="tap">hover for code then tap for data</a
>

<a id="dynamic" data-sveltekit-preload-data="hover" href="/data-sveltekit/preload-data/target?x={x}"
	>dynamic</a
>
<button id="change_dynamic" type="button" on:click={() => x++}>change dynamic</button>
