import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const module_name = '$app';

const __dirname = dirname(fileURLToPath(import.meta.url));
const typings_file = join(__dirname, '..', 'index.d.ts');

function add_module_name_after(str, in_str) {
	return in_str.replace(
		new RegExp(`${str}(?!${module_name.replace('$', '\\$')})`, 'g'),
		`${str}${module_name}/`
	);
}

const data = readFileSync(typings_file, 'utf8');
writeFileSync(
	typings_file,
	add_module_name_after(' module "', add_module_name_after(' from "', data)),
	'utf8'
);