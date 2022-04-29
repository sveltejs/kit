<script context="module">
	export function load() {
		return {
			stuff: {
				name: 'SvelteKit',
				value: 123
			}
		};
	}
</script>

<script>
	import { page } from '$app/stores';
</script>

<div id="store-stuff">{JSON.stringify($page.stuff)}</div>

<nav><a href="/store/stuff/xxx">xxx</a> <a href="/store/stuff/yyy">yyy</a> <a href="/store/stuff/zzz">zzz</a> <a href="/store/stuff/foo">foo</a></nav>

<slot />
