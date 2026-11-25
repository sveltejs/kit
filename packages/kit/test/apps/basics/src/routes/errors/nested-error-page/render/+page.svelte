<script>
	function fail() {
		throw new Error('render failed');
	}
</script>

<p>{fail()}</p>
