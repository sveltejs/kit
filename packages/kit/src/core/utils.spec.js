import { suite } from 'uvu';
import * as assert from 'uvu/assert';
import { deep_merge } from './utils.js';

const deepMergeSuite = suite('deep_merge');

deepMergeSuite('basic test no conflicts', async () => {
	const [merged, conflicts] = deep_merge(
		{
			version: 1,
			animalSounds: {
				cow: 'moo'
			}
		},
		{
			animalSounds: {
				duck: 'quack'
			},
			locale: 'en_US'
		}
	);
	assert.equal(merged, {
		version: 1,
		locale: 'en_US',
		animalSounds: {
			cow: 'moo',
			duck: 'quack'
		}
	});
	assert.equal(conflicts, []);
});

deepMergeSuite('three way merge no conflicts', async () => {
	const [merged, conflicts] = deep_merge(
		{
			animalSounds: {
				cow: 'moo'
			}
		},
		{
			animalSounds: {
				duck: 'quack'
			}
		},
		{
			animalSounds: {
				dog: {
					singular: 'bark',
					plural: 'barks'
				}
			}
		}
	);
	assert.equal(merged, {
		animalSounds: {
			cow: 'moo',
			duck: 'quack',
			dog: {
				singular: 'bark',
				plural: 'barks'
			}
		}
	});
	assert.equal(conflicts, []);
});

deepMergeSuite('merge with conflicts', async () => {
	const [merged, conflicts] = deep_merge(
		{
			person: {
				firstName: 'John',
				lastName: 'Doe',
				address: {
					line1: '123 Main St',
					city: 'Seattle',
					state: 'WA'
				}
			}
		},
		{
			person: {
				middleInitial: 'Q',
				address: '123 Main St, Seattle, WA'
			}
		}
	);
	assert.equal(merged, {
		person: {
			firstName: 'John',
			middleInitial: 'Q',
			lastName: 'Doe',
			address: '123 Main St, Seattle, WA'
		}
	});
	assert.equal(conflicts, ['person.address']);
});

deepMergeSuite('merge with arrays', async () => {
	const [merged] = deep_merge(
		{
			paths: ['/foo', '/bar']
		},
		{
			paths: ['/alpha', '/beta']
		}
	);
	assert.equal(merged, {
		paths: ['/foo', '/bar', '/alpha', '/beta']
	});
});

deepMergeSuite('empty', async () => {
	const [merged] = deep_merge();
	assert.equal(merged, {});
});

deepMergeSuite('mutability safety', () => {
	const input1 = {
		person: {
			firstName: 'John',
			lastName: 'Doe',
			address: {
				line1: '123 Main St',
				city: 'Seattle'
			}
		}
	};
	const input2 = {
		person: {
			middleInitial: 'L',
			lastName: 'Smith',
			address: {
				state: 'WA'
			}
		}
	};
	const snapshot1 = JSON.stringify(input1);
	const snapshot2 = JSON.stringify(input2);

	const [merged] = deep_merge(input1, input2);

	// Mess with the result
	merged.person.middleInitial = 'Z';
	merged.person.address.zipCode = '98103';
	merged.person = {};

	// Make sure nothing in the inputs changed
	assert.snapshot(snapshot1, JSON.stringify(input1));
	assert.snapshot(snapshot2, JSON.stringify(input2));
});

deepMergeSuite.run();
