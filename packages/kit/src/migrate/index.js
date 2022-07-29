import fs from 'fs';
import path from 'path';
import { walk } from '../utils/filesystem';
import { adjust_page_endpoints } from './adjust-page-endpoints';
import { adjust_standalone_endpoints } from './adjust-standalone-endpoints';
import { extract_load } from './extract-load';
import { move_files } from './move-files';

/**
 * @param {import('types').ValidatedConfig} config
 * @param {string} cwd
 */
export function migrate(config, cwd = process.cwd()) {
	check_if_already_migrated();

	const migration_folder_tmp = path.join(config.kit.outDir, '.migration');

	const old_branch_hierarchy = walk_hierarchical(config.kit.files.routes);
	move_files(old_branch_hierarchy, migration_folder_tmp);

	const new_branch_hierarchy = walk_hierarchical(migration_folder_tmp);
	const load_todos = extract_load(new_branch_hierarchy, config.extensions);
	const page_endpoint_todos = adjust_page_endpoints(new_branch_hierarchy);
	const standalone_endpoint_todos = adjust_standalone_endpoints(new_branch_hierarchy);

	// Write todos
	fs.writeFileSync(
		path.join(cwd, 'migration-todos.md'),
		`# Migration TODOs
        
TODO some prosa and link to PR
` + [load_todos, page_endpoint_todos, standalone_endpoint_todos].join('\n\n')
	);
}

function check_if_already_migrated() {
	// TODO throw if that's the case
}

/**
 * @param {string} root
 */
function walk_hierarchical(root) {
	const files = walk(root);
	/** @type {import('./types').BranchHierarchy} */
	const hierarchy = { path: root, files: [], folders: [] };
	// TODO
	return hierarchy;
}
