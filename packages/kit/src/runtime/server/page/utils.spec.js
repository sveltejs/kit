import { Response } from 'undici';
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { is_pojo, is_serializable_primitive, warn_if_not_serdeable } from './utils.js';

test('is_pojo', () => {
	assert.ok(is_pojo({}));
	assert.not(is_pojo(new Map()));
	assert.not(is_pojo(new Response()));
	assert.not(is_pojo(new Uint8Array()));
});

test('is_serializable_primitive', () => {
	assert.ok(is_serializable_primitive(1));
	assert.ok(is_serializable_primitive(null));
	assert.ok(is_serializable_primitive(undefined));
	assert.ok(is_serializable_primitive('hello'));
	assert.ok(is_serializable_primitive(Number(42)));
	assert.ok(is_serializable_primitive(String('')));

	assert.not(is_serializable_primitive(NaN));
	assert.not(is_serializable_primitive({}));
	assert.not(is_serializable_primitive([]));
});

test('logs warning for non-serializable bodies', () => {
	let count = 0;

	const original = console.warn;
	console.warn = () => count++;

	try {
		warn_if_not_serdeable(new Map());
		warn_if_not_serdeable({ foo: new Map() });
		warn_if_not_serdeable({
			foo: {
				bar: [new Map()]
			}
		});
		warn_if_not_serdeable({
			foo: {
				bar: [
					{
						baz: 'quox'
					}
				]
			}
		});
	} finally {
		console.warn = original;
	}

	assert.equal(count, 3);
});

test.run();
