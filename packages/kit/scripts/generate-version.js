import fs from 'node:fs';
import path from 'node:path';

const pkg = JSON.parse(
	fs.readFileSync(path.join(import.meta.dirname, '..', 'package.json'), 'utf-8')
);

fs.writeFileSync(
	path.join(import.meta.dirname, '..', 'src', 'version.js'),
	`// generated during release, do not modify\n\n/** @type {string} */\nexport const VERSION = '${pkg.version}';\n`
);
