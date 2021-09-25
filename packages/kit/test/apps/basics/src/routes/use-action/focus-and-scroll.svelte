<script>
	const focusAndScroll = /** @param {HTMLInputElement} node */ (node) => {
		node.focus();
		node.scrollIntoView();
	};
</script>

<div>They (don't) see me scrollin'...</div>
<div style="background-color: peru;">
	<label for="input">Focus! </label>
	<input use:focusAndScroll id="input" type="text" />
</div>
<div style="background-color: teal;">They (not) focusin'</div>

<style>
	div {
		background-color: hotpink;
		height: 180vh;
	}
</style>
