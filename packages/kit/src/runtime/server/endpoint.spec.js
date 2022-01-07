import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { is_content_type_textual } from './endpoint.js';

test('is_content_type_textual', () => {
	assert.equal(is_content_type_textual(undefined), true);
	assert.equal(is_content_type_textual(null), true);
	assert.equal(is_content_type_textual(''), true);
	assert.equal(is_content_type_textual('TEXT/PLAIN'), true);
	assert.equal(is_content_type_textual('text/html'), true);
	assert.equal(is_content_type_textual('text/javascript'), true);
	assert.equal(is_content_type_textual('application/xml'), true);
	assert.equal(is_content_type_textual('image/svg+xml'), true);
	assert.equal(is_content_type_textual('application/json'), true);
	assert.equal(is_content_type_textual('text/plain; charset="us-ascii"'), true);
	assert.equal(is_content_type_textual('multipart/form-data; boundary=aBoundaryString'), true);

	assert.equal(is_content_type_textual('multipart/byteranges; boundary=3d6b6a416f9b5'), false);
	assert.equal(is_content_type_textual('image/apng'), false);
	assert.equal(is_content_type_textual('IMAGE/webp'), false);
	assert.equal(is_content_type_textual('application/octet-stream'), false);
});

test.run();
