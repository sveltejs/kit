<script>
	import { disableScrollHandling } from '$app/navigation';

	const focusAndScroll = /** @param {HTMLInputElement} node */ (node) => {
		disableScrollHandling();

		node.focus();
		node.scrollIntoView();
	};
</script>

<div>They (don't) see me scrollin'...</div>
<div style="height: 180vh; background-color: peru;">
	<label for="input">Focus! </label>
	<input use:focusAndScroll id="input" type="text" />
</div>
<div style="height: 180vh; background-color: teal;">They (not) focusin'</div>
