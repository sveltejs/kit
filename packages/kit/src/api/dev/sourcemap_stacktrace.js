import fs from 'fs';
import path from 'path';
import { SourceMapConsumer } from 'source-map';

function get_sourcemap_url(contents) {
	const reversed = contents.split('\n').reverse().join('\n');

	const match = /\/[/*]#[ \t]+sourceMappingURL=([^\s'"]+?)(?:[ \t]+|$)/gm.exec(reversed);
	if (match) return match[1];

	return undefined;
}

const file_cache = new Map();

function get_file_contents(file_path) {
	if (file_cache.has(file_path)) {
		return file_cache.get(file_path);
	}

	try {
		const data = fs.readFileSync(file_path, 'utf8');
		file_cache.set(file_path, data);
		return data;
	} catch {
		return undefined;
	}
}

async function replace_async(str, regex, asyncFn) {
	const promises = [];
	str.replace(regex, (match, ...args) => {
		const promise = asyncFn(match, ...args);
		promises.push(promise);
	});
	const data = await Promise.all(promises);
	return str.replace(regex, () => data.shift());
}

export async function sourcemap_stacktrace(stack) {
	const replace = (line) =>
		replace_async(
			line,
			/^ {4}at (?:(.+?)\s+\()?(?:(.+?):(\d+)(?::(\d+))?)\)?/,
			async (input, var_name, file_path, line_number, column) => {
				if (!file_path) return input;

				const contents = get_file_contents(file_path);
				if (!contents) return input;

				const sourcemap_url = get_sourcemap_url(contents);
				if (!sourcemap_url) return input;

				let dir = path.dirname(file_path);
				let sourcemap_data;

				if (/^data:application\/json[^,]+base64,/.test(sourcemap_url)) {
					const raw_data = sourcemap_url.slice(sourcemap_url.indexOf(',') + 1);
					try {
						sourcemap_data = Buffer.from(raw_data, 'base64').toString();
					} catch {
						return input;
					}
				} else {
					const sourcemap_path = path.resolve(dir, sourcemap_url);
					const data = get_file_contents(sourcemap_path);

					if (!data) return input;

					sourcemap_data = data;
					dir = path.dirname(sourcemap_path);
				}

				let raw_sourcemap;
				try {
					raw_sourcemap = JSON.parse(sourcemap_data);
				} catch {
					return input;
				}

				// TODO: according to typings, this code cannot work;
				// the constructor returns a promise that needs to be awaited
				const consumer = await new SourceMapConsumer(raw_sourcemap);
				const pos = consumer.originalPositionFor({
					line: Number(line_number),
					column: Number(column),
					bias: SourceMapConsumer.LEAST_UPPER_BOUND
				});

				if (!pos.source) return input;

				const source_path = path.resolve(dir, pos.source);
				const source = `${source_path}:${pos.line || 0}:${pos.column || 0}`;

				if (!var_name) return `    at ${source}`;
				return `    at ${var_name} (${source})`;
			}
		);

	file_cache.clear();

	return (await Promise.all(stack.split('\n').map(replace))).join('\n');
}
