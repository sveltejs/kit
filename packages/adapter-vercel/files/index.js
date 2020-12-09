'use strict';

var url = require('url');

function read_only_form_data() {
	const map = new Map();

	return {
		append(key, value) {
			if (map.has(key)) {
				map.get(key).push(value);
			} else {
				map.set(key, [value]);
			}
		},

		data: new ReadOnlyFormData(map)
	};
}

class ReadOnlyFormData {
	#map;

	constructor(map) {
		this.#map = map;
	}

	get(key) {
		const value = this.#map.get(key);
		return value && value[0];
	}

	getAll(key) {
		return this.#map.get(key);
	}

	has(key) {
		return this.#map.has(key);
	}

	*[Symbol.iterator]() {
		for (const [key, value] of this.#map) {
			for (let i = 0; i < value.length; i += 1) {
				yield [key, value[i]];
			}
		}
	}

	*entries() {
		for (const [key, value] of this.#map) {
			for (let i = 0; i < value.length; i += 1) {
				yield [key, value[i]];
			}
		}
	}

	*keys() {
		for (const [key, value] of this.#map) {
			for (let i = 0; i < value.length; i += 1) {
				yield key;
			}
		}
	}

	*values() {
		for (const [, value] of this.#map) {
			for (let i = 0; i < value.length; i += 1) {
				yield value;
			}
		}
	}
}

function get_body(req) {
	const headers = req.headers;
	const has_body =
		headers['content-type'] !== undefined &&
		// https://github.com/jshttp/type-is/blob/c1f4388c71c8a01f79934e68f630ca4a15fffcd6/index.js#L81-L95
		(headers['transfer-encoding'] !== undefined || !isNaN(Number(headers['content-length'])));

	if (!has_body) return Promise.resolve(undefined);

	const [type, ...directives] = headers['content-type'].split(/;\s*/);

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

async function get_json(req) {
	return JSON.parse(await get_text(req));
}

async function get_urlencoded(req) {
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

async function get_multipart(req, boundary) {
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
		const match = /\s*([\s\S]+?)\r\n\r\n([\s\S]*)\s*/.exec(part);
		const raw_headers = match[1];
		const body = match[2].trim();

		let key;
		raw_headers.split('\r\n').forEach((str) => {
			const [raw_header, ...raw_directives] = str.split('; ');
			let [name, value] = raw_header.split(': ');

			name = name.toLowerCase();

			const directives = {};
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

		if (!key) nope();

		append(key, body);
	});

	return data;
}

function get_text(req) {
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

function get_buffer(req) {
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

const app = require('./server/app.js');

var index = async (req, res) => {
	const { pathname, query = '' } = url.parse(req.url || '');

	const rendered = await app.render({
		host: null, // TODO
		method: req.method,
		headers: req.headers,
		path: pathname,
		query: new url.URLSearchParams(query),
		body: await get_body(req)
	});

	if (rendered) {
		const { status, headers, body } = rendered;
		return res.writeHead(status, headers).end(body);
	}

	return res.writeHead(404).end();
};

module.exports = index;
//# sourceMappingURL=index.js.map
