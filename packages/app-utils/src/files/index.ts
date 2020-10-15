import fs from 'fs';
import path from 'path';

const mkdirp = dir => {
	try {
		fs.mkdirSync(dir, { recursive: true });
	} catch {}
};

export function copy(
	from,
	to,
	filter: (file?: string) => boolean = () => true
) {
	if (!filter(path.basename(from))) return;

	const stats = fs.statSync(from);

	if (stats.isDirectory()) {
		fs.readdirSync(from).forEach(file => {
			copy(path.join(from, file), path.join(to, file));
		});
	} else {
		mkdirp(path.dirname(to));
		fs.copyFileSync(from, to);
	}
}