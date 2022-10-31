import fs from 'fs';
import path from 'path';
import { create } from '../index.js';

const repo = process.argv[2];

fs.readdirSync(repo).forEach((file) => {
	if (file !== '.git') {
		fs.rmSync(path.join(repo, file), {
			recursive: true,
			force: true
		});
	}
});

await create(repo, {
	name: 'kit-template-default',
	template: 'default',
	eslint: false,
	types: 'checkjs',
	prettier: true,
	playwright: false
});

// Remove the Sverdle from the template because it doesn't work within Stackblitz (cookies not set)
fs.rmSync(path.join(repo, 'src', 'routes', 'sverdle'), { force: true, recursive: true });

const header = fs.readFileSync(path.join(repo, 'src', 'routes', 'Header.svelte'), 'utf-8');
fs.writeFileSync(
	path.join(repo, 'svelte.config.js'),
	header.replace(/<\/li>\s+<li.+?'\/sverdle'[\s\S]+?<\/li>/, '</li>')
);

const about = fs.readFileSync(path.join(repo, 'src', 'routes', 'about', '+page.svelte'), 'utf-8');
fs.writeFileSync(
	path.join(repo, 'src', 'routes', 'about', '+page.svelte'),
	about.replace(/<\/p>\s+<p>\s+?[\s\S]+?Sverdle[\s\S]+?<\/p>/, '</p>')
);
