<script>
	import { browser } from '$app/env';
	import { PUBLIC_LOOK_IN_OPTIONS_2 } from '$app/env/public';

	/** @type {import('./$types').PageProps} */
	let { data } = $props();
</script>

<p data-testid="public">public: {PUBLIC_LOOK_IN_OPTIONS_2}</p>
<p data-testid="browser">browser: {browser}</p>
<p data-testid="private-dynamic">private dynamic: {data.private_dynamic}</p>
<p data-testid="private-static">private static: {data.private_static}</p>
<p data-testid="private-validated-default">
	private validated default: {data.private_validated_default}
</p>
