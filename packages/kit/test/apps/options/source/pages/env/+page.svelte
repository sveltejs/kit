<script>
	import { GO_AWAY_PLEASE } from '$env/static/public';
	export let data;
</script>

<p id="public">{GO_AWAY_PLEASE}</p>
<p id="private">{data.TOP_SECRET_SHH_PLS}</p>
<p id="neither">{data.MATCHES_NEITHER}</p>
