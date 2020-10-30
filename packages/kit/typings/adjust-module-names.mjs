import { readFile, writeFile } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const module_name = '$app';

const __dirname = dirname(fileURLToPath(import.meta.url));
const typings_file = join(__dirname, '..', 'index.d.ts');

function handle_error(e) {
	if (e) {
		console.error(e.message);
		process.exit(1);
	}
}

function add_module_name_after(str, in_str) {
	return in_str.replace(
		new RegExp(`${str}(?!${module_name.replace('$', '\\$')})`, 'g'),
		`${str}${module_name}/`
	);
}

readFile(typings_file, 'utf8', (err, data) => {
	if (err) {
		handle_error(err);
	} else {
		writeFile(
			join(__dirname, '..', 'index.d.ts'),
			add_module_name_after(' module "', add_module_name_after(' from "', data)),
			'utf8',
			handle_error
		);
	}
});
