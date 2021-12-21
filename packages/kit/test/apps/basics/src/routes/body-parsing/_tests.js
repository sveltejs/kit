import * as assert from 'uvu/assert';
import { FormData, File } from 'formdata-node';

/** @type {import('test').TestMaker} */
export default function (test) {
	test('handles single file upload', null, async ({ fetch }) => {
		const file1 = new File(['Lorem ipsum dolor sit amet'], 'file1.txt');

		const formData = new FormData();

		formData.append('file1', file1, 'file1.txt');

		const response = await fetch('/body-parsing/single-file-upload', {
			method: 'POST',
			//@ts-ignore
			body: formData
		});

		const data = await response.json();

		assert.equal(data, { filename: 'file1.txt', content: 'Lorem ipsum dolor sit amet' });
	});

	test('handles multiple file uploads', null, async ({ fetch }) => {
		const file1 = new File(['Lorem ipsum dolor sit amet'], 'file1.txt');
		const file2 = new File(['Lorem ipsum dolor sit amet.'], 'file2.txt');

		const formData = new FormData();

		formData.append('files[]', file1, 'file1.txt');
		formData.append('files[]', file2, 'file2.txt');

		const response = await fetch('/body-parsing/multi-file-upload', {
			method: 'POST',
			//@ts-ignore
			body: formData
		});

		/** @type {any} */
		const data = await response.json();

		assert.equal(data, { filenames: ['file1.txt', 'file2.txt'] });
	});

	test('parses urlencoded form data', null, async ({ fetch }) => {
		const body = new URLSearchParams();

		body.append('foo', 'foo');
		body.append('bar', 'bar');
		body.append('baz[]', 'baz');
		body.append('baz[]', 'buzz');

		const response = await fetch('/body-parsing/url-encoded', {
			method: 'POST',
			body
		});

		/** @type {any} */
		const data = await response.json();

		assert.equal(data, { foo: 'foo', bar: 'bar', baz: ['baz', 'buzz'] });
	});

	test('can parse files and fields together', null, async ({ fetch }) => {
		const file1 = new File(['Lorem ipsum dolor sit amet'], 'file1.txt');

		const formData = new FormData();

		formData.append('file1', file1, 'file1.txt');
		formData.append('field1', 'foo');
		formData.append('multifield[]', 'bar');
		formData.append('multifield[]', 'baz');

		const response = await fetch('/body-parsing/mixed-files-and-fields', {
			method: 'POST',
			// @ts-ignore
			body: formData
		});

		/** @type {any} */
		const data = await response.json();

		assert.equal(data, {
			file1: { filename: 'file1.txt', content: 'Lorem ipsum dolor sit amet' },
			field1: 'foo',
			multifield: ['bar', 'baz']
		});
	});
}
