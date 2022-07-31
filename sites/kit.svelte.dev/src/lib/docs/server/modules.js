import { modules } from '../../../../../../packages/kit/docs/types.js';

/** @param {'types' | 'exports'} kind */
export function render_modules(kind) {
	return modules
		.map((module) => {
			// special case — we want to include $lib etc in the modules page
			const is_exempt = kind === 'exports' && module.exempt;
			const skip = module[kind].length === 0 && !is_exempt;

			if (skip) return '';

			return `### ${module.name}\n\n${module.comment}\n\n${module[kind]
				.map((type) => `#### ${type.name}\n\n${type.comment}\n\n\`\`\`ts\n${type.snippet}\n\`\`\``)
				.join('\n\n')}`;
		})
		.join('\n\n');
}
