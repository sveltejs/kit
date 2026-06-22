<script>
	let { data } = $props();

	function handleBlur() {
		// Without the fix, data was already nulled when blur fired during
		// navigation, causing "Cannot read properties of undefined".
		// We write to window so the result survives component teardown.
		/** @type {any} */ (window).__blur_test_result = data.message;
	}
</script>

<h1>Blur test</h1>
<input id="blur-input" onblur={handleBlur} />
<a href="/accessibility/blur-during-navigation/other">Go to other</a>
