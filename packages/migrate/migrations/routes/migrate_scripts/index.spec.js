import { assert, test } from 'vitest';
import { migrate_scripts } from './index.js';
import { read_samples } from '../../../utils.js';

for (const sample of read_samples(new URL('./samples.md', import.meta.url))) {
	test(sample.description, () => {
		const actual = migrate_scripts(
			sample.before,
			sample.description.includes('error'),
			sample.description.includes('moved')
		);
		assert.equal(actual.main, sample.after);
	});
}
