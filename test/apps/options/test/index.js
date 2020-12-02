import * as assert from 'uvu/assert';
import { runner } from '../../../runner'; // TODO make this a package?

runner((test, is_dev) => {
	test('serves /', async ({ visit, contains, js }) => {
		await visit('/');
		assert.ok(await contains('I am in the template'), 'Should show custom template contents');
		assert.ok(await contains('We\'re on index.svelte'), 'Should show page contents');
		assert.ok(await contains(`Hello from the ${js ? 'client' : 'server'}!`), 'Should run JavaScript');
	});
});