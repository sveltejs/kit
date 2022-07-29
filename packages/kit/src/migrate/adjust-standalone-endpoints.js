import { forEachFile } from './utils';

/**
 * Adjust code in standalone endpoints
 *
 * @param {import('./types').BranchHierarchy} branch_hierarchy
 */
export function adjust_standalone_endpoints(branch_hierarchy) {
	const todos = forEachFile(branch_hierarchy, /\+data\.(\w+)/, (content) => ({
		content:
			'throw new Error("@migration task: update standalone endpoint. See https://TODO how")\n' +
			content,
		todo: 'update standalone endpoint'
	}));

	return `## Standalone Endpoints
	
${todos.join('\n')}`;
}
