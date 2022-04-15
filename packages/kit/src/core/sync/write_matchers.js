import path from 'path';
import { s } from '../../utils/misc.js';
import { write_if_changed } from './utils.js';

/**
 * @param {import('types').ManifestData} manifest_data
 * @param {string} output
 */
export function write_matchers(manifest_data, output) {
	const imports = [];
	const matchers = [];

	for (const key in manifest_data.matchers) {
		const src = manifest_data.matchers[key];

		imports.push(`import { match as ${key} } from ${s(path.relative(output, src))};`);
		matchers.push(key);
	}

	const module = imports.length
		? `${imports.join('\n')}\n\nexport const matchers = { ${matchers.join(', ')} };`
		: 'export const matchers = {};';

	write_if_changed(`${output}/client-matchers.js`, module);
}
