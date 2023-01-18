import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { queue } from './queue.js';

/** @param {number} ms */
function sleep(ms) {
	return new Promise((f) => setTimeout(f, ms));
}

test('q.add resolves to the correct value', async () => {
	const q = queue(1);

	const value = await q.add(() => 42);
	assert.equal(value, 42);
});

test('q.add rejects if task rejects', async () => {
	const q = queue(1);

	try {
		await q.add(async () => {
			await sleep(1);
			throw new Error('nope');
		});

		assert.ok(false);
	} catch (e) {
		assert.equal(/** @type {Error} */ (e).message, 'nope');
	}
});

test('starts tasks in sequence', async () => {
	const q = queue(2);

	const promises = [];

	/** @type {Array<(value?: any) => void>} */
	const fulfils = [];

	const started = [false, false, false, false];
	const finished = [false, false, false, false];

	for (let i = 0; i < 4; i += 1) {
		promises[i] = q
			.add(() => {
				started[i] = true;
				return new Promise((f) => {
					fulfils.push(f);
				});
			})
			.then(() => {
				finished[i] = true;
			});
	}

	assert.equal(started, [true, true, false, false]);
	assert.equal(finished, [false, false, false, false]);

	fulfils[0]();
	await promises[0];

	assert.equal(started, [true, true, true, false]);
	assert.equal(finished, [true, false, false, false]);

	fulfils[1]();
	await promises[1];

	assert.equal(started, [true, true, true, true]);
	assert.equal(finished, [true, true, false, false]);

	fulfils[2]();
	fulfils[3]();
	await q.done();

	assert.equal(finished, [true, true, true, true]);
});

test('q.add fails if queue is already finished', async () => {
	const q = queue(1);
	q.add(() => {});

	await q.done();
	assert.throws(() => q.add(() => {}), /Cannot add tasks to a queue that has ended/);
});

test('q.done() resolves if nothing was added to the queue', async () => {
	const q = queue(100);
	await Promise.race([
		q.done(),
		sleep(1).then(() => {
			throw new Error('Timed out');
		})
	]);
});

test('q.done() rejects if task rejects', async () => {
	const q = queue(1);

	q.add(async () => {
		await sleep(1);
		throw new Error('nope');
	}).catch((e) => {
		assert.equal(e.message, 'nope');
	});

	try {
		await q.done();
		assert.ok(false);
	} catch (e) {
		assert.equal(/** @type {Error} */ (e).message, 'nope');
	}
});

test.run();
