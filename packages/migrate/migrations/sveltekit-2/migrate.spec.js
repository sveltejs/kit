import { assert, test } from 'vitest';
import {
	transform_code,
	update_svelte_config_content,
	update_tsconfig_content
} from './migrate.js';
import { read_samples } from '../../utils.js';

for (const sample of read_samples(new URL('./svelte-config-samples.md', import.meta.url))) {
	test('svelte.config.js: ' + sample.description, () => {
		const actual = update_svelte_config_content(sample.before);
		assert.equal(actual, sample.after);
	});
}

for (const sample of read_samples(new URL('./tsconfig-samples.md', import.meta.url))) {
	test('tsconfig.json: ' + sample.description, () => {
		const actual = update_tsconfig_content(sample.before);
		assert.equal(actual, sample.after);
	});
}

for (const sample of read_samples(new URL('./tsjs-samples.md', import.meta.url))) {
	test('JS/TS file: ' + sample.description, () => {
		const actual = transform_code(
			sample.before,
			sample.filename?.endsWith('.ts') ?? false,
			sample.filename ?? '+page.js'
		);
		assert.equal(actual, sample.after);
	});
}
