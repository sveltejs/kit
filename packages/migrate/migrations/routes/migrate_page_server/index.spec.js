import { assert, test } from 'vitest';
import { migrate_page_server } from './index.js';
import { read_samples } from '../../../utils.js';

for (const sample of read_samples(new URL('./samples.md', import.meta.url))) {
	test(sample.description, () => {
		const actual = migrate_page_server(sample.before, sample.filename ?? '+page.server.js');
		assert.equal(actual, sample.after);
	});
}
