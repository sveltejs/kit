import fs from 'fs';
import path from 'path';
import glob from 'tiny-glob/sync.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const cwd = path.join(__dirname, '../../../documentation/docs');

const doc_filenames = glob('**/*.md', { cwd });
const doc_urls = new Set();

// 1. collect all doc links and hashes

for (const doc of doc_filenames) {
	doc_urls.add(doc_name_to_link(doc));

	const content = fs.readFileSync(`${cwd}/${doc}`, 'utf-8');

	const headlines = content.matchAll(/### .+/g);
	if (!headlines) continue;

	let last_headline = '';

	for (let headline of headlines) {
		let hash = slugify(headline[0].slice(3).trim());
		if (content.charAt(headline.index - 1) === '#') {
			hash = last_headline + '-' + hash;
		} else {
			last_headline = hash;
		}
		doc_urls.add(doc_name_to_link(doc) + '#' + hash);
	}
}

let bad = false;

// 2. check docs for broken links

for (const doc of doc_filenames) {
	const content = fs.readFileSync(`${cwd}/${doc}`, 'utf-8');

	const links = content.match(/\]\(([^)]+)\)/g);
	if (!links) continue;

	for (const link of links) {
		let url = link.slice(2, -1);

		if (url.startsWith('http')) continue;
		if (url.startsWith('/faq')) continue;
		if (url.startsWith('/docs/')) url = url.slice(6);
		if (url.startsWith('#')) url = doc_name_to_link(doc) + url;

		const [path] = url.split('#');
		if (path === 'modules' || path === 'types' || path === 'configuration') continue; // autogenerated docs

		if (!doc_urls.has(url)) {
			bad = true;
			console.error(`Bad link: ${url} in ${doc}`);
		}
	}
}

// 3. check SvelteKit docs for broken links

for (const file of walk_kit_dir(path.join(__dirname, '../../../packages/kit'))) {
	const content = fs.readFileSync(path.join(__dirname, '../../../packages/kit', file), 'utf-8');

	const links = content.matchAll(/https:\/\/kit\.svelte\.dev\/docs\/([a-z$\-#]+)/g);
	if (!links) continue;

	for (const [, link] of links) {
		const [path] = link.split('#');
		if (path === 'modules' || path === 'types' || path === 'configuration') continue; // autogenerated docs

		if (!doc_urls.has(link)) {
			bad = true;
			console.error(`Bad link: ${link} in ${file}`);
		}
	}
}

if (bad) {
	process.exit(1);
}

function walk_kit_dir(cwd) {
	/** @type {string[]} */
	const all_files = [];

	/** @param {string} dir */
	function walk_dir(dir) {
		const files = fs.readdirSync(path.join(cwd, dir));

		for (const file of files) {
			if (
				['node_modules', 'test', 'tests', 'docs', '.turbo', '.svelte-kit', 'CHANGELOG.md'].includes(
					file
				)
			) {
				continue;
			}

			const joined = path.join(dir, file);
			const stats = fs.statSync(path.join(cwd, joined));
			if (stats.isDirectory()) {
				walk_dir(joined);
			} else {
				all_files.push(joined);
			}
		}
	}

	return walk_dir(''), all_files;
}

function doc_name_to_link(file) {
	return file.split(path.sep).pop().slice(3, -3);
}

function slugify(title) {
	return title
		.toLowerCase()
		.replace(/&lt;/g, '')
		.replace(/&gt;/g, '')
		.replace(/[^a-z0-9-$]/g, '-')
		.replace(/-{2,}/g, '-')
		.replace(/^-/, '')
		.replace(/-$/, '');
}
