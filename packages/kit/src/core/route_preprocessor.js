import path from 'path';
import MagicString from 'magic-string';

/**
 * Injects __handle_route of `@sveltejs/init-route` to handle scrolling when component mounts
 * @param {import('types/config').ValidatedConfig} config
 * @returns {import('svelte/types/compiler/preprocess').PreprocessorGroup}
 */
export function route_preprocessor(config) {
	return {
		markup({ content, filename }) {
			if (
				filename &&
				filename.startsWith(config.kit.files.routes) &&
				config.extensions.some((ext) => filename.endsWith(ext)) &&
				!path.basename(filename).startsWith('_')
			) {
				const s = new MagicString(content);
				s.prepend(`<svelte:body use:__handle_route></svelte:body>`);

				const script_start_regex = /<script.*?>/g;
				if (script_start_regex.test(content)) {
					s.appendLeft(
						script_start_regex.lastIndex,
						`import { __handle_route } from '@sveltejs/kit/router';`
					);
				} else {
					s.prepend(`<script>import { __handle_route } from '@sveltejs/kit/router';</script>`);
				}

				return {
					code: s.toString(),
					map: s.generateMap({ hires: true, source: filename })
				};
			}
		}
	};
}
