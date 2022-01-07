import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { is_text } from './endpoint.js';

test('is_text', () => {
	assert.equal(is_text(undefined), true);
	assert.equal(is_text(null), true);
	assert.equal(is_text(''), true);
	assert.equal(is_text('TEXT/PLAIN'), true);
	assert.equal(is_text('text/html'), true);
	assert.equal(is_text('text/javascript'), true);
	assert.equal(is_text('application/xml'), true);
	assert.equal(is_text('image/svg+xml'), true);
	assert.equal(is_text('application/json'), true);
	assert.equal(is_text('text/plain; charset="us-ascii"'), true);
	assert.equal(is_text('multipart/form-data; boundary=aBoundaryString'), true);

	assert.equal(is_text('multipart/byteranges; boundary=3d6b6a416f9b5'), false);
	assert.equal(is_text('image/apng'), false);
	assert.equal(is_text('IMAGE/webp'), false);
	assert.equal(is_text('application/octet-stream'), false);
});

test.run();
