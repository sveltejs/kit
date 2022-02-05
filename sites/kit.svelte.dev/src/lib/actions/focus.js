/** @param {HTMLElement} node */
export function focusable_children(node) {
	const nodes = Array.from(
		node.querySelectorAll(
			'a[href], button, input, textarea, select, details, [tabindex]:not([tabindex="-1"])'
		)
	);

	const index = nodes.indexOf(document.activeElement);

	const update = (d) => {
		let i = index + d;
		i += nodes.length;
		i %= nodes.length;

		// @ts-expect-error
		nodes[i].focus();
	};

	return {
		update
	};
}

export function trap(node) {
	const handle_keydown = (e) => {
		if (e.key === 'Tab') {
			e.preventDefault();

			const group = focusable_children(node);
			group.update(e.shiftKey ? -1 : 1);
		}
	};

	node.addEventListener('keydown', handle_keydown);

	return {
		destroy: () => {
			node.removeEventListener('keydown', handle_keydown);
		}
	};
}
