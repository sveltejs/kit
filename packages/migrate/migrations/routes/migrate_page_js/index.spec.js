import { read_samples } from '../utils.js';
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { migrate_page } from './index.js';

for (const sample of read_samples(import.meta.url)) {
	test(sample.description, () => {
		const actual = migrate_page(sample.before, sample.filename ?? '+page.js');
		assert.equal(actual, sample.after);
	});
}

test.run();
