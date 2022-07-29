import { forEachFile } from './utils';

/**
 * Adjust code in page endpoints
 *
 * @param {import('./types').BranchHierarchy} branch_hierarchy
 */
export function adjust_page_endpoints(branch_hierarchy) {
	const todos = forEachFile(branch_hierarchy, /\+page-data\.(\w+)/, (content) => ({
		content:
			'throw new Error("@migration task: update page endpoint. See https://TODO how")\n' + content,
		todo: 'update page endpoint'
	}));

	return `## Page Endpoints
	
${todos.join('\n')}`;
}
