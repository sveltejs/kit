import { modules } from './type-info.js';

/** @param {'types' | 'exports'} kind */
export function render_modules(kind) {
	return modules
		.map((module) => {
			// special case — we want to include $lib etc in the modules page
			const is_exempt = kind === 'exports' && module.exempt;
			const skip = module[kind].length === 0 && !is_exempt;

			if (skip) return '';

			return `### ${module.name}\n\n${module.comment}\n\n${module[kind]
				.map((type) => {
					return `#### ${type.name}\n\n${type.comment}\n\n${type.markdown}`;
				})
				.join('\n\n')}`;
		})
		.join('\n\n');
}
