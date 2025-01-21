<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<p class="layout">{data.layout}</p>
<button
	type="button"
	class="specified"
	on:click={() =>
		(window.promise = goto(page.url.pathname, {
			invalidate: ['invalidate-depends-goto:layout', 'invalidate-depends-goto:shared']
		}))}
>
	invalidate specified
</button>

<p class="server">{data.server}</p>
<button
	type="button"
	class="server"
	on:click={() =>
		(window.promise = goto(page.url.pathname, { invalidate: ['invalidate-depends-goto:server'] }))}
>
	invalidate server
</button>

<p class="shared">{data.shared}</p>
<button
	type="button"
	class="shared"
	on:click={() =>
		(window.promise = goto(page.url.pathname, { invalidate: ['invalidate-depends-goto:shared'] }))}
>
	invalidate shared
</button>

<p class="neither">neither</p>
<button
	type="button"
	class="neither"
	on:click={() =>
		(window.promise = goto(page.url.pathname, { invalidate: ['invalidate-depends-goto:neither'] }))}
>
	invalidate neither
</button>
