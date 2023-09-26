import { assert, test } from 'vitest';
import { read_samples } from '../utils.js';
import { migrate_server } from './index.js';

for (const sample of read_samples(import.meta.url)) {
	test(sample.description, () => {
		const actual = migrate_server(sample.before);
		assert.equal(actual, sample.after);
	});
}
