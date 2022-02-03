import fs from 'fs';
import { marked } from 'marked';
import PrismJS from 'prismjs';

import 'prismjs/components/prism-bash.js';
import 'prismjs/components/prism-diff.js';
import 'prismjs/components/prism-typescript.js';
import 'prism-svelte';

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

/** @param {string} dir */
export function read(dir) {
	return fs
		.readdirSync(`../../documentation/${dir}`)
		.map((file) => {
			const match = /\d{2}-(.+)\.md/.exec(file);
			if (!match) return;

			const slug = match[1];

			const markdown = fs.readFileSync(`../../documentation/${dir}/${file}`, 'utf-8');
			const { title, sections, content } = parse(markdown, file);

			return { title, slug, file, sections, content };
		})
		.filter(Boolean);
}

function parse(markdown, file) {
	const { body, metadata } = extract_frontmatter(markdown);

	const slug = slugify(metadata.title);

	const headings = [, slug];
	const sections = [];

	let section;

	marked.use({
		renderer: {
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

				return `<h${level} id="${slug}">${html}</h${level}>`;
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
		}
	});

	const content = marked(body);

	return {
		slug,
		title: metadata.title,
		sections,
		content
	};
}

function extract_frontmatter(markdown) {
	const match = /---\r?\n([\s\S]+?)\r?\n---/.exec(markdown);
	const frontmatter = match[1];
	const body = markdown.slice(match[0].length);

	const metadata = {};
	frontmatter.split('\n').forEach((pair) => {
		const i = pair.indexOf(':');
		metadata[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
	});

	return { metadata, body };
}

function slugify(title) {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9-$]/g, '-')
		.replace(/-{2,}/g, '-')
		.replace(/^-/, '')
		.replace(/-$/, '');
}
