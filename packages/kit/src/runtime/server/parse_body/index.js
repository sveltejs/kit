import { read_only_form_data } from './read_only_form_data.js';
import busboy from '@fastify/busboy';

/**
 * @param {import('types/app').RawBody} rawBody
 * @param {import('types/helper').RequestHeaders} headers
 */
export function parse_body(rawBody, headers) {
	if (!rawBody) return rawBody;

	const content_type = headers['content-type'];
	const [type] = content_type ? content_type.split(/;\s*/) : [];

	const text = () => new TextDecoder(headers['content-encoding'] || 'utf-8').decode(rawBody);

	switch (type) {
		case 'text/plain':
			return text();

		case 'application/json':
			return JSON.parse(text());

		case 'application/x-www-form-urlencoded':
		case 'multipart/form-data':
			return parse_form(rawBody, headers);

		default:
			return rawBody;
	}
}

/**
 * @param {import('types/app').RawBody} rawBody
 * @param {import('types/helper').RequestHeaders} headers
 */
function parse_form(rawBody, headers) {
	return new Promise((fulfil, reject) => {
		const bb = busboy({
			headers: {
				'content-type': headers['content-type']
			}
		});

		const { data, append, appendFile } = read_only_form_data();

		bb.on('file', (fieldname, file, filename, encoding, mimeType) => {
			/**
			 * @type {import('types/helper').File}
			 */
			// @ts-ignore
			const uploadFile = {};

			file.on('data', (data) => {
				uploadFile.data = data;
			});

			file.on('end', () => {
				if (uploadFile.data) {
					uploadFile.filename = filename;
					uploadFile.mimeType = mimeType;
					uploadFile.encoding = encoding;
					appendFile(fieldname, uploadFile);
				}
			});
		});

		bb.on('field', (fieldname, value) => {
			append(fieldname, value);
		});

		bb.on('error', (error) => {
			reject(error);
		});

		bb.on('finish', () => {
			fulfil(data);
		});

		bb.write(rawBody);
		bb.end();
	});
}
