<script context="module">
	export function preload() {
		this.prevent_start && this.prevent_start();
	}
</script>

<script>
	let env = typeof window !== 'undefined' ? 'browser' : 'server';
</script>

<h1>Hi from {env}</h1>
