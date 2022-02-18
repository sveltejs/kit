import fs from 'fs';
import { renderCodeToHTML, runTwoSlash, createShikiHighlighter } from 'shiki-twoslash';
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
export async function read_file(dir, file) {
	const match = /\d{2}-(.+)\.md/.exec(file);
	if (!match) return null;

	const slug = match[1];

	const markdown = fs.readFileSync(`${base}/${dir}/${file}`, 'utf-8');

	const highlighter = await createShikiHighlighter({ theme: 'css-variables' });

	return {
		file: `${dir}/${file}`,
		slug: match[1],
		// third argument is a gross hack to accommodate FAQ
		...parse(
			markdown,
			file,
			dir === 'faq' ? slug : undefined,
			(/** @type {string} */ source, /** @type {string} */ lang) => {
				let file = '';

				source = source
					.replace(/\/\/\/ file: (.+)\n/, (match, value) => {
						file = value;
						return '';
					})
					.replace(/^(    )+/gm, (match) => {
						// for no good reason at all, marked replaces tabs with spaces
						let tabs = '';
						for (let i = 0; i < match.length; i += 4) {
							tabs += '\t';
						}
						return tabs;
					});

				if (lang === 'js' || lang === 'ts') {
					const twoslash = runTwoSlash(source, lang, {
						defaultCompilerOptions: {
							allowJs: true,
							checkJs: true,
							target: 'es2021'
						}
					});

					const html = renderCodeToHTML(
						twoslash.code,
						'ts',
						{ twoslash: true },
						{},
						highlighter,
						twoslash
					);

					// preserve blank lines in output (maybe there's a more correct way to do this?)
					return `<div class="code-block">${file ? `<h5>${file}</h5>` : ''}${html.replace(
						/<div class='line'><\/div>/g,
						'<div class="line"> </div>'
					)}</div>`;
				}

				const plang = languages[lang];
				const highlighted = plang
					? PrismJS.highlight(source, PrismJS.languages[plang], lang)
					: source.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

				return `<div class="code-block">${
					file ? `<h5>${file}</h5>` : ''
				}<pre class='language-${plang}'><code>${highlighted}</code></pre></div>`;
			}
		)
	};
}

/**
 * @param {string} dir
 * @param {string} slug
 */
export async function read(dir, slug) {
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
		section: await read_file(dir, files[index])
	};
}

/** @param {string} dir */
export async function read_all(dir) {
	const result = [];

	for (const file of fs.readdirSync(`${base}/${dir}`)) {
		const section = await read_file(dir, file);
		if (section) result.push(section);
	}

	return result;
}

/** @param {string} dir */
export function read_headings(dir) {
	return fs
		.readdirSync(`${base}/${dir}`)
		.map((file) => {
			const match = /\d{2}-(.+)\.md/.exec(file);
			if (!match) return null;

			const slug = match[1];

			const markdown = fs.readFileSync(`${base}/${dir}/${file}`, 'utf-8');

			return {
				file: `${dir}/${file}`,
				slug: match[1],
				// third argument is a gross hack to accommodate FAQ
				...parse(markdown, file, dir === 'faq' ? slug : undefined, () => '')
			};
		})
		.filter(Boolean);
}

/**
 * @param {string} markdown
 * @param {string} file
 * @param {string} [main_slug]
 */
function parse(markdown, file, main_slug, code) {
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
		code
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
