<script>
	import { greeting } from './data.remote.js';
</script>

<!-- TODO use `await` expression once async SSR lands -->
{#await greeting() then x}
	<h1>{x.bar()}</h1>
{/await}
