import path from 'path';
import { s } from '../../utils/misc.js';
import { write_if_changed } from './utils.js';

/**
 * @param {import('types').ManifestData} manifest_data
 * @param {string} output
 */
export function write_validators(manifest_data, output) {
	const imports = [];
	const validators = [];

	for (const key in manifest_data.validators) {
		const src = manifest_data.validators[key];

		imports.push(`import { validate as ${key} } from ${s(path.relative(output, src))};`);
		validators.push(key);
	}

	const module = imports.length
		? `${imports.join('\n')}\n\nexport const validators = { ${validators.join(', ')} };`
		: 'export const validators = {};';

	write_if_changed(`${output}/client-validators.js`, module);
}
