<script lang="ts">
	import { afterNavigate } from '$app/navigation';

	let types = $state<string[]>([]);
	afterNavigate(({ type }) => types.push(type));

	const text = await new Promise<string>((resolve) => setTimeout(() => resolve('ready'), 50));
</script>

<p>{text}</p>
<output>{types.join(' ')}</output>
<a href="?again">navigate to self</a>
