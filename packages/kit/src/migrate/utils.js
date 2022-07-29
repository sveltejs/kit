import fs from 'fs';
import path from 'path';

/**
 * For each file in the tree that matches `file_matcher`, do something. Returns a list of todos that are
 * collected from `fun` invocations.
 *
 * @param {import('./types').BranchHierarchy} branch_hierarchy
 *
 * @param {RegExp} file_matcher If string, invokes ".startsWith" on the file
 *
 * @param {(content: string, match: RegExpMatchArray, moved_down: boolean) => undefined | {content: string, todo?: string, file?: {name: string; content: string; todo?: string}}} fun
 * File content and match in, new content and possibly a todo and new file out
 */
export function forEachFile(branch_hierarchy, file_matcher, fun) {
	/** @type {string[]} */
	const todos = [];

	/** @type {RegExpMatchArray|null} */
	let match = null;
	const file = branch_hierarchy.files.find((file) => (match = file_matcher.exec(file.name)));
	if (file && match) {
		const result = fun(
			fs.readFileSync(path.join(branch_hierarchy.path, file.name), 'utf-8'),
			match,
			file.moved_down
		);
		if (result) {
			const { content, todo, file: new_file } = result;
			fs.writeFileSync(path.join(branch_hierarchy.path, file.name), content);
			if (todo) {
				todos.push(`- [ ] ${todo} (at ${file})`);
			}
			if (new_file) {
				fs.writeFileSync(
					path.join(branch_hierarchy.path, new_file.name),
					new_file.content,
					'utf-8'
				);
				if (new_file.todo) {
					todos.push(
						`- [ ] ${new_file.todo} (at ${path.join(branch_hierarchy.path, new_file.name)})`
					);
				}
			}
		}
	}

	for (const folder of branch_hierarchy.folders) {
		todos.push(...forEachFile(folder, file_matcher, fun));
	}

	return todos;
}
