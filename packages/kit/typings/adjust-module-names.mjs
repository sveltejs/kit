import { readFile, writeFile } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const moduleName = '$app';

const __dirname = dirname(fileURLToPath(import.meta.url));
const typingsFile = join(__dirname, '..', 'index.d.ts');

function onError(e) {
	if (e) {
		console.error(e.message);
		process.exit(1);
	}
}

function addModuleNameAfter(str, inStr) {
	return inStr.replace(
		new RegExp(`${str}(?!${moduleName.replace('$', '\\$')})`, 'g'),
		`${str}${moduleName}/`
	);
}

readFile(typingsFile, 'utf8', (err, data) => {
	if (err) {
		onError(err);
	} else {
		writeFile(
			join(__dirname, '..', 'index.d.ts'),
			addModuleNameAfter(' module "', addModuleNameAfter(' from "', data)),
			'utf8',
			onError
		);
	}
});
