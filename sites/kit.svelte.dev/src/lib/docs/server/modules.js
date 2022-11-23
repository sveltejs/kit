import { modules } from '../../../../../../packages/kit/docs/types.js';

// Markdown doesn't give us a good way to nest code blocks inside an element,
// so we resort to this hackery
const OPEN = '```ts-open\n```';
const CLOSE = '```ts-close\n```';

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
									const params = part.params
										.map(([name, desc]) => `- \`${name}\` ${desc}`)
										.join('\n');
									const returns = part.returns
										? `${params ? '\n' : ''}- Returns ${part.returns}`
										: '';

									return (
										`<div class="ts-block-property">\n\n\`\`\`ts\n${part.snippet}\n\`\`\`\n\n` +
										`<div class="ts-block-property-details">\n\n` +
										params +
										returns +
										(params ? '\n\n' : '') +
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
