<script>
	export let data;
</script>

<p data-testid="buildtime-only">
	buildtime-only environment variable exists: {data.buildtime_environment_variable ?? 'undefined'}
</p>
