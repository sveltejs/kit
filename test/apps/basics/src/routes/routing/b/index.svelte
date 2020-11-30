<script context="module">
	export function preload() {
		return this.fetch('/routing/b.json').then(r => r.json()).then(letter => {
			return { letter };
		});
	}
</script>

<script>
	export let letter;
</script>

<h1>{letter}</h1>