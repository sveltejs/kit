<script>
	import { PUBLIC_LOOK_IN_OPTIONS_2 } from '$env/static/public';
	import { env } from '$env/dynamic/public';
</script>

<p data-testid="static">static: {PUBLIC_LOOK_IN_OPTIONS_2}</p>
<p data-testid="dynamic">dynamic: {env.PUBLIC_LOOK_IN_OPTIONS_2}</p>
