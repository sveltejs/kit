import { IncomingMessage } from 'http';
import { read_only_form_data } from './read_only_form_data';

export function get_body(req: IncomingMessage) {
	const headers = req.headers;
	const has_body =
		headers['content-type'] !== undefined &&
		// https://github.com/jshttp/type-is/blob/c1f4388c71c8a01f79934e68f630ca4a15fffcd6/index.js#L81-L95
		(headers['transfer-encoding'] !== undefined || !isNaN(Number(headers['content-length'])));

	if (!has_body) return Promise.resolve(undefined);

	const [type, ...directives] = (headers['content-type'] as string).split(/;\s*/);

	switch (type) {
		case 'application/octet-stream':
			return get_buffer(req);

		case 'text/plain':
			return get_text(req);

		case 'application/json':
			return get_json(req);

		case 'application/x-www-form-urlencoded':
			return get_urlencoded(req);

		case 'multipart/form-data':
			const boundary = directives.find((directive) => directive.startsWith('boundary='));
			if (!boundary) throw new Error(`Missing boundary`);
			return get_multipart(req, boundary.slice('boundary='.length));

		default:
			throw new Error(`Invalid Content-Type ${type}`);
	}
}

async function get_json(req: IncomingMessage) {
	return JSON.parse(await get_text(req));
}

async function get_urlencoded(req: IncomingMessage) {
	const text = await get_text(req);

	const { data, append } = read_only_form_data();

	text
		.replace(/\+/g, ' ')
		.split('&')
		.forEach((str) => {
			const [key, value] = str.split('=');
			append(decodeURIComponent(key), decodeURIComponent(value));
		});

	return data;
}

async function get_multipart(req: IncomingMessage, boundary: string) {
	const text = await get_text(req);
	const parts = text.split(`--${boundary}`);

	const nope = () => {
		throw new Error('Malformed form data');
	};

	if (parts[0] !== '' || parts[parts.length - 1].trim() !== '--') {
		nope();
	}

	const { data, append } = read_only_form_data();

	parts.slice(1, -1).forEach((part) => {
		const match = /\s*([\s\S]+?)\r\n\r\n([\s\S]*)\s*/.exec(part) as RegExpMatchArray;
		const raw_headers = match[1];
		const body = match[2].trim();

		let key: string;

		const headers: Record<string, string> = {};
		raw_headers.split('\r\n').forEach((str) => {
			const [raw_header, ...raw_directives] = str.split('; ');
			let [name, value] = raw_header.split(': ');

			name = name.toLowerCase();
			headers[name] = value;

			const directives: Record<string, string> = {};
			raw_directives.forEach((raw_directive) => {
				const [name, value] = raw_directive.split('=');
				directives[name] = JSON.parse(value); // TODO is this right?
			});

			if (name === 'content-disposition') {
				if (value !== 'form-data') nope();

				if (directives.filename) {
					// TODO we probably don't want to do this automatically
					throw new Error('File upload is not yet implemented');
				}

				if (directives.name) {
					key = directives.name;
				}
			}
		});

		if (!key!) nope();

		append(key!, body);
	});

	return data;
}

function get_text(req: IncomingMessage): Promise<string> {
	return new Promise((fulfil, reject) => {
		let data = '';

		req.on('error', reject);

		req.on('data', (chunk) => {
			data += chunk;
		});

		req.on('end', () => {
			fulfil(data);
		});
	});
}

function get_buffer(req: IncomingMessage): Promise<ArrayBuffer> {
	return new Promise((fulfil, reject) => {
		let data = new Uint8Array(0);

		req.on('error', reject);

		req.on('data', (chunk) => {
			const new_data = new Uint8Array(data.length + chunk.length);

			for (let i = 0; i < data.length; i += 1) {
				new_data[i] = data[i];
			}

			for (let i = 0; i < chunk.length; i += 1) {
				new_data[i + data.length] = chunk[i];
			}

			data = new_data;
		});

		req.on('end', () => {
			fulfil(data.buffer);
		});
	});
}
