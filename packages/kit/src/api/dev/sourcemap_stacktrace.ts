import fs from 'fs';
import path from 'path';
import { SourceMapConsumer, RawSourceMap } from 'source-map';

function get_sourcemap_url(contents: string) {
	const reversed = contents
		.split('\n')
		.reverse()
		.join('\n');

	const match = /\/[/*]#[ \t]+sourceMappingURL=([^\s'"]+?)(?:[ \t]+|$)/gm.exec(reversed);
	if (match) return match[1];

	return undefined;
}

const file_cache = new Map<string, string>();

function get_file_contents(path: string) {
	if (file_cache.has(path)) {
		return file_cache.get(path);
	}

	try {
		const data = fs.readFileSync(path, 'utf8');
		file_cache.set(path, data);
		return data;
	} catch {
		return undefined;
	}
}

export function sourcemap_stacktrace(stack: string) {
	const replace = (line: string) =>
		line.replace(
			/^ {4}at (?:(.+?)\s+\()?(?:(.+?):(\d+)(?::(\d+))?)\)?/,
			(input, var_name, file_path, line, column) => {
				if (!file_path) return input;

				const contents = get_file_contents(file_path);
				if (!contents) return input;

				const sourcemap_url = get_sourcemap_url(contents);
				if (!sourcemap_url) return input;

				let dir = path.dirname(file_path);
				let sourcemap_data: string;

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

				let raw_sourcemap: RawSourceMap;
				try {
					raw_sourcemap = JSON.parse(sourcemap_data);
				} catch {
					return input;
				}

				// TODO: according to typings, this code cannot work; 
				// the constructor returns a promise that needs to be awaited
				const consumer = new (SourceMapConsumer as any)(raw_sourcemap);
				const pos = consumer.originalPositionFor({
					line: Number(line),
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

	return stack
		.split('\n')
		.map(replace)
		.join('\n');
}
