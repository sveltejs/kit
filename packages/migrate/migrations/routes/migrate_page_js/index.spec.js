import { assert, test } from 'vitest';
import { migrate_page } from './index.js';
import { read_samples } from '../../../utils.js';

for (const sample of read_samples(new URL('./samples.md', import.meta.url))) {
	test(sample.description, () => {
		const actual = migrate_page(sample.before, sample.filename ?? '+page.js');
		assert.equal(actual, sample.after);
	});
}
