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
					let content = `#### ${type.name}\n\n${type.comment}\n\n<div class="ts-block">\n\n\`\`\`ts\n${type.snippet}\n\`\`\``;

					if (type.parts?.length) {
						content +=
							'\n\n' +
							type.parts
								.map((part) => {
									const bullets = part.params.map(([name, desc]) => `- \`${name}\` ${desc}`);

									if (part.default) bullets.push(`- Default \`${part.default}\``);
									if (part.returns) bullets.push(`- Returns ${part.returns}`);

									return (
										`<div class="ts-block-property">\n\n\`\`\`ts\n${part.snippet}\n\`\`\`\n\n` +
										`<div class="ts-block-property-details">\n\n` +
										bullets.join('\n') +
										'\n\n' +
										part.content +
										'\n</div></div>'
									);
								})
								.join('\n\n');
					}

					content += `\n\n</div>`;

					return content;
				})
				.join('\n\n')}`;
		})
		.join('\n\n');
}
