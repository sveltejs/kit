import fs from 'fs';
import PrismJS from 'prismjs';
import 'prismjs/components/prism-bash.js';
import 'prismjs/components/prism-diff.js';
import 'prismjs/components/prism-typescript.js';
import 'prism-svelte';
import { extract_frontmatter, transform } from './markdown';

const languages = {
	bash: 'bash',
	env: 'bash',
	html: 'markup',
	svelte: 'svelte',
	js: 'javascript',
	css: 'css',
	diff: 'diff',
	ts: 'typescript',
	'': ''
};

const base = '../../documentation';

/**
 * @param {string} dir
 * @param {string} file
 */
export function read_file(dir, file) {
	const match = /\d{2}-(.+)\.md/.exec(file);
	if (!match) return null;

	const slug = match[1];

	const markdown = fs.readFileSync(`${base}/${dir}/${file}`, 'utf-8');

	return {
		file: `${dir}/${file}`,
		slug: match[1],
		// third argument is a gross hack to accommodate FAQ
		...parse(markdown, file, dir === 'faq' ? slug : undefined)
	};
}

/**
 * @param {string} dir
 * @param {string} slug
 */
export function read(dir, slug) {
	const files = fs.readdirSync(`${base}/${dir}`).filter((file) => /^\d{2}-(.+)\.md$/.test(file));
	const index = files.findIndex((file) => file.slice(3, -3) === slug);

	if (index === -1) return null;

	const prev = index > 0 && files[index - 1];
	const next = index < files.length - 1 && files[index + 1];

	const summarise = (file) => ({
		slug: file.slice(3, -3), // remove 00- prefix and .md suffix
		title: extract_frontmatter(fs.readFileSync(`${base}/${dir}/${file}`, 'utf8')).metadata.title
	});

	return {
		prev: prev && summarise(prev),
		next: next && summarise(next),
		section: read_file(dir, files[index])
	};
}

/** @param {string} dir */
export function read_all(dir) {
	return fs
		.readdirSync(`${base}/${dir}`)
		.map((file) => read_file(dir, file))
		.filter(Boolean);
}

/**
 * @param {string} markdown
 * @param {string} file
 * @param {string} [main_slug]
 */
function parse(markdown, file, main_slug) {
	const { body, metadata } = extract_frontmatter(markdown);

	const headings = main_slug ? [main_slug] : [];
	const sections = [];

	let section;

	const content = transform(body, {
		heading(html, level) {
			const title = html
				.replace(/&quot;/g, '"')
				.replace(/&lt;/g, '<')
				.replace(/&gt;/g, '>');

			const normalized = slugify(title);

			headings[level - 1] = normalized;
			headings.length = level;

			const slug = headings.filter(Boolean).join('-');

			if (level === 3) {
				section = {
					title,
					slug,
					sections: []
				};

				sections.push(section);
			} else if (level === 4) {
				section.sections.push({
					title,
					slug
				});
			} else {
				throw new Error(`Unexpected <h${level}> in ${file}`);
			}

			return `<h${level} id="${slug}">${html}<a href="#${slug}" class="anchor"><span class="visually-hidden">permalink</span></a></h${level}>`;
		},
		code(source, lang) {
			// for no good reason at all, marked replaces tabs with spaces
			source = source.replace(/^(    )+/gm, (match) => {
				let tabs = '';
				for (let i = 0; i < match.length; i += 4) {
					tabs += '\t';
				}
				return tabs;
			});

			const plang = languages[lang];
			const highlighted = plang
				? PrismJS.highlight(source, PrismJS.languages[plang], lang)
				: source.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

			return `<div class="code-block"><pre class='language-${plang}'><code>${highlighted}</code></pre></div>`;
		}
	});

	return {
		title: metadata.title,
		sections,
		content
	};
}

/** @param {string} title */
export function slugify(title) {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9-$]/g, '-')
		.replace(/-{2,}/g, '-')
		.replace(/^-/, '')
		.replace(/-$/, '');
}
