import {
	extract_static_imports,
	adjust_imports,
	guess_indent,
	comment,
	error,
	task
} from '../utils.js';
import * as TASKS from '../tasks.js';

/**
 * @param {string} content
 * @param {boolean} is_error
 * @param {boolean} moved
 */
export function migrate_scripts(content, is_error, moved) {
	/** @type {string | null} */
	let module = null;

	// module script
	let main = content.replace(
		/<script([^>]+?context=(['"])module\1[^>]*)>([^]*?)<\/script>/,
		(match, attrs, quote, contents) => {
			const imports = extract_static_imports(moved ? adjust_imports(contents) : contents);

			if (is_error) {
				// special case — load is no longer supported in load
				const indent = guess_indent(contents) ?? '';

				contents = comment(contents);
				const body = `\n${indent}${error('Replace error load function', '3293209')}\n${contents}`;

				return `<script${attrs}>${body}</script>`;
			}

			module = contents.replace(/^\n/, '');
			return `<!--\n${task(
				'Check for missing imports and code that should be moved back to the module context',
				TASKS.PAGE_MODULE_CTX
			)}\n\nThe following imports were found:\n${imports.length ? imports.join('\n') : '-'}\n-->`;
		}
	);

	// instance script
	const edited = main.replace(/<script([^]*?)>([^]+?)<\/script>/, (match, attrs, content) => {
		const indent = guess_indent(content) ?? '';

		if (moved) {
			content = adjust_imports(content);
		}

		if (!is_error && /export/.test(content)) {
			content = `\n${indent}${error('Add data prop', TASKS.PAGE_DATA_PROP)}\n${content}`;
			// Possible TODO: migrate props to data.prop, or suggest $: ({propX, propY, ...} = data);
		}

		return `<script${attrs}>${content}</script>`;
	});

	return { module, main: edited };
}
