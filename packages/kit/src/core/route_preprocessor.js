import path from 'path';
import MagicString from 'magic-string';
import { normalizePath } from 'vite';

/**
 * Injects `use:__handle_route` from `@sveltejs/kit/router` to handle scrolling when route component mounts
 * @param {import('types/config').ValidatedConfig} config
 * @returns {import('svelte/types/compiler/preprocess').PreprocessorGroup}
 */
export function route_preprocessor(config) {
	// Vite normalizes `filename` so we normalize the config's as well
	const routesPath = normalizePath(config.kit.files.routes);

	return {
		markup({ content, filename }) {
			if (
				filename &&
				filename.startsWith(routesPath) &&
				config.extensions.some((ext) => filename.endsWith(ext)) &&
				!path.basename(filename).startsWith('_')
			) {
				const s = new MagicString(content);

				const svelte_body_regex = /<svelte:body[^>]*\/>|<svelte:body.*<\/svelte:body>/;
				let svelte_body_match;
				if ((svelte_body_match = svelte_body_regex.exec(content))) {
					const start_index = svelte_body_match.index;
					const end_index = svelte_body_match.index + svelte_body_match[0].length;
					let svelte_body = s.slice(start_index, end_index);
					svelte_body =
						svelte_body.substring(0, 12) + ' use:__handle_route' + svelte_body.substring(12);
					s.remove(start_index, end_index);
					s.prepend(svelte_body);
				} else {
					s.prepend('<svelte:body use:__handle_route></svelte:body>');
				}

				const script_start_regex = /<script.*?>/g;
				if (script_start_regex.test(content)) {
					s.appendLeft(
						script_start_regex.lastIndex,
						'import { __handle_route } from "@sveltejs/kit/router";'
					);
				} else {
					s.prepend('<script>import { __handle_route } from "@sveltejs/kit/router";</script>');
				}

				return {
					code: s.toString(),
					map: s.generateMap({ hires: true, source: filename })
				};
			}
		}
	};
}
