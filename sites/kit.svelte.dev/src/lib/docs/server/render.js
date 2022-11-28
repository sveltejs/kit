import { modules } from './type-info.js';

/** @param {'types' | 'exports'} kind */
export function render(kind) {
	return modules
		.map((module) => {
			// special case — we want to include $lib etc in the modules page
			const is_exempt = kind === 'exports' && module.exempt;
			const skip = module[kind].length === 0 && !is_exempt;

			if (skip) return '';

			return `### ${module.name}\n\n${module.comment}\n\n${module[kind]
				.map((type) => {
					const markdown =
						`<div class="ts-block">${fence(type.snippet)}` +
						type.children.map(stringify).join('\n\n') +
						`</div>`;
					return `#### ${type.name}\n\n${type.comment}\n\n${markdown}`;
				})
				.join('\n\n')}`;
		})
		.join('\n\n');
}

/**
 * @param {string} code
 * @param {string} lang
 */
function fence(code, lang = 'dts') {
	return '\n\n```' + lang + '\n' + code + '\n```\n\n';
}

/**
 * @param {import('./types').Type} member
 */
function stringify(member) {
	// @ts-ignore
	const doc = member.jsDoc?.[0];

	const bullet_block =
		member.bullets.length > 0
			? `\n\n<div class="ts-block-property-bullets">\n\n${member.bullets.join('\n')}</div>`
			: '';

	const child_block =
		member.children.length > 0
			? `\n\n<div class="ts-block-property-children">${member.children
					.map(stringify)
					.join('\n')}</div>`
			: '';

	return (
		`<div class="ts-block-property">${fence(member.snippet)}` +
		`<div class="ts-block-property-details">\n\n` +
		bullet_block +
		'\n\n' +
		(doc?.comment ?? '')
			.replace(/\/\/\/ type: (.+)/g, '/** @type {$1} */')
			.replace(/^(  )+/gm, (match, spaces) => {
				return '\t'.repeat(match.length / 2);
			}) +
		child_block +
		'\n</div></div>'
	);
}
