import * as fs from 'fs';
import * as path from 'path';

export function mkdirp(dir: string) {
	try {
		fs.mkdirSync(dir, { recursive: true });
	} catch (e) {
		if (e.code === 'EEXIST') return;
		throw e;
	}
}

export function copy(
	from: string,
	to: string,
	filter: (file?: string) => boolean = () => true
): string[] {
	if (!filter(path.basename(from))) return [];

	const files = [];
	const stats = fs.statSync(from);

	if (stats.isDirectory()) {
		fs.readdirSync(from).forEach((file) => {
			files.push(...copy(path.join(from, file), path.join(to, file)));
		});
	} else {
		mkdirp(path.dirname(to));
		fs.copyFileSync(from, to);
		files.push(to);
	}

	return files;
}
