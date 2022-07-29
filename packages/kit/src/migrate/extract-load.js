import { forEachFile } from './utils';

/**
 * Move load function in out of module context of Svelte files into own file and adjust code
 *
 * @param {import('./types').BranchHierarchy} branch_hierarchy
 * @param {string[]} ext File extensions that signal Svelte files
 */
export function extract_load(branch_hierarchy, ext) {
	const ext_regex = ext.map((e) => e.replace('.', '\\.')).join('|');

	const page_todos = forEachFile(
		branch_hierarchy,
		new RegExp(`\\+page(@\\w+)?(${ext_regex})`),
		(content, [, referenced_layout]) => {
			// TODO:
			// 1. use regex to extra context=module (don't parse, we could be using TS)
			// 2. use TS to parse contents and
			//     - find .svelte imports which should be left in the Svelte file and removed from the new file
			//     - replace __types import (for jsdocs try regex-replace)
			//     - adjust imports if this was moved into a folder
			// 3. throw an error in the new ts/js file to tell people to adjust the code
			// 4. see if we can update props in load
			return {
				content: content,
				todo: 'check if page file was updated properly', // TODO check if props present, if yes, also add this to the todo
				file: {
					content: 'todo',
					name: `+load${referenced_layout ? `@${referenced_layout}` : ''}.js`, // TODO TS or JS? -> check lang="ts" presence in Svelte file
					todo: 'update load'
				}
			};
		}
	);
	const layout_todos = forEachFile(
		branch_hierarchy,
		new RegExp(`\\+layout(-\\w+)?(@\\w+)?${ext_regex}`),
		(content, [, layout_name, referenced_layout]) => {
			// TODO: same as above
			return {
				content: content,
				todo: 'check if layout file was updated properly', // TODO check if props present, if yes, also add this to the todo
				file: {
					content: 'todo',
					name: `+layout${layout_name ? `-${layout_name}` : ''}${
						referenced_layout ? `@${referenced_layout}` : ''
					}.js`, // TODO TS or JS? -> check lang="ts" presence in Svelte file
					todo: 'update load'
				}
			};
		}
	);

	return `## Pages
${page_todos.join('\n')}
    
## Layouts
${layout_todos.join('\n')}`;
}
