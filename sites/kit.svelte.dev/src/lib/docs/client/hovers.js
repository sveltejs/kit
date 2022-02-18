import { onMount } from 'svelte';
import Tooltip from './Tooltip.svelte';

export function setup() {
	onMount(() => {
		let tooltip;

		function over(event) {
			if (event.target.tagName === 'DATA-LSP') {
				if (!tooltip) {
					tooltip = new Tooltip({
						target: document.body
					});
				}

				const rect = event.target.getBoundingClientRect();
				const text = event.target.getAttribute('lsp');

				const x = (rect.left + rect.right) / 2 + window.scrollX;
				const y = rect.top + window.scrollY;

				tooltip.$set({
					text,
					x,
					y
				});
			}
		}

		function out(event) {
			if (event.target.tagName === 'DATA-LSP') {
				tooltip.$destroy();
				tooltip = null;
			}
		}

		window.addEventListener('mouseover', over);
		window.addEventListener('mouseout', out);

		return () => {
			window.removeEventListener('mouseover', over);
			window.removeEventListener('mouseout', out);
		};
	});
}
