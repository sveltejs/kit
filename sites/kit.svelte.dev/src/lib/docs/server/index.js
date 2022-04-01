import fs from 'fs';
import { renderCodeToHTML, runTwoSlash, createShikiHighlighter } from 'shiki-twoslash';
import PrismJS from 'prismjs';
import 'prismjs/components/prism-bash.js';
import 'prismjs/components/prism-diff.js';
import 'prismjs/components/prism-typescript.js';
import 'prism-svelte';
import { extract_frontmatter, transform } from './markdown';
import { modules } from '../../../../../../documentation/types.js';
import { render_modules } from './modules';

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

const type_regex = new RegExp(
	`(import\\(&apos;@sveltejs\\/kit&apos;\\)\\.)?\\b(${modules
		.map((module) => module.types)
		.flat()
		.map((type) => type.name)
		.join('|')})\\b`,
	'g'
);

const type_links = new Map();

modules.forEach((module) => {
	const slug = slugify(module.name);

	module.types.forEach((type) => {
		const link = `/docs/types#${slug}-${slugify(type.name)}`;
		type_links.set(type.name, link);
	});
});

/**
 * @param {string} dir
 * @param {string} file
 */
export async function read_file(dir, file) {
	const match = /\d{2}-(.+)\.md/.exec(file);
	if (!match) return null;

	const slug = match[1];

	const markdown = fs
		.readFileSync(`${base}/${dir}/${file}`, 'utf-8')
		.replace('**TYPES**', () => render_modules('types'))
		.replace('**EXPORTS**', () => render_modules('exports'));

	const highlighter = await createShikiHighlighter({ theme: 'css-variables' });

	const { metadata, body } = extract_frontmatter(markdown);

	const { content } = parse({
		body,
		file,
		// gross hack to accommodate FAQ
		slug: dir === 'faq' ? slug : undefined,
		code: (source, language, current) => {
			/** @type {Record<string, string>} */
			const options = {};

			let html = '';

			source = source
				.replace(/\/\/\/ (.+?): (.+)\n/gm, (match, key, value) => {
					options[key] = value;
					return '';
				})
				.replace(/^([\-\+])?((?:    )+)/gm, (match, prefix = '', spaces) => {
					if (prefix && language !== 'diff') return match;

					// for no good reason at all, marked replaces tabs with spaces
					let tabs = '';
					for (let i = 0; i < spaces.length; i += 4) {
						tabs += '  ';
					}
					return prefix + tabs;
				})
				.replace(/\*\\\//g, '*/');

			if (language === 'js') {
				const twoslash = runTwoSlash(source, language, {
					defaultCompilerOptions: {
						allowJs: true,
						checkJs: true,
						target: 'es2021'
					}
				});

				html = renderCodeToHTML(twoslash.code, 'ts', { twoslash: true }, {}, highlighter, twoslash);

				// we need to be able to inject the LSP attributes as HTML, not text, so we
				// turn &lt; into &amp;lt;
				html = html.replace(/<data-lsp lsp='(.+?)' *>(\w+)<\/data-lsp>/g, (match, lsp, name) => {
					return `<data-lsp lsp='${lsp.replace(/&/g, '&amp;')}'>${name}</data-lsp>`;
				});

				// preserve blank lines in output (maybe there's a more correct way to do this?)
				html = `<div class="code-block">${
					options.file ? `<h5>${options.file}</h5>` : ''
				}${html.replace(/<div class='line'><\/div>/g, '<div class="line"> </div>')}</div>`;
			} else if (language === 'diff') {
				const lines = source.split('\n').map((content) => {
					let type = null;
					if (/^[\+\-]/.test(content)) {
						type = content[0] === '+' ? 'inserted' : 'deleted';
						content = content.slice(1);
					}

					return {
						type,
						content
					};
				});

				html = `<div class="code-block"><pre class="language-diff"><code>${lines
					.map((line) => {
						if (line.type) return `<span class="${line.type}">${line.content}\n</span>`;
						return line.content + '\n';
					})
					.join('')}</code></pre></div>`;
			} else {
				const plang = languages[language];
				const highlighted = plang
					? PrismJS.highlight(source, PrismJS.languages[plang], language)
					: source.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

				html = `<div class="code-block">${
					options.file ? `<h5>${options.file}</h5>` : ''
				}<pre class='language-${plang}'><code>${highlighted}</code></pre></div>`;
			}

			type_regex.lastIndex = 0;

			return html
				.replace(type_regex, (match, prefix, name) => {
					if (options.link === 'false' || name === current) {
						// we don't want e.g. RequestHandler to link to RequestHandler
						return match;
					}

					const link = `<a href="${type_links.get(name)}">${name}</a>`;
					return `${prefix || ''}${link}`;
				})
				.replace(
					/^(\s+)<span class="token comment">([\s\S]+?)<\/span>\n/gm,
					(match, intro_whitespace, content) => {
						// we use some CSS trickery to make comments break onto multiple lines while preserving indentation
						const lines = (intro_whitespace + content).split('\n');
						return lines
							.map((line) => {
								const match = /^(\s*)(.*)/.exec(line);
								const indent = (match[1] ?? '').replace(/\t/g, '  ').length;

								return `<span class="token comment wrapped" style="--indent: ${indent}ch">${
									line ?? ''
								}</span>`;
							})
							.join('');
					}
				);
		},
		codespan: (text) => {
			return (
				'<code>' +
				text.replace(type_regex, (match, prefix, name) => {
					const link = `<a href="${type_links.get(name)}">${name}</a>`;
					return `${prefix || ''}${link}`;
				}) +
				'</code>'
			);
		}
	});

	return {
		file: `${dir}/${file}`,
		slug: match[1],
		title: metadata.title,
		content
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

			const markdown = fs
				.readFileSync(`${base}/${dir}/${file}`, 'utf-8')
				.replace('**TYPES**', () => render_modules('types'))
				.replace('**EXPORTS**', () => render_modules('exports'));

			const { body, metadata } = extract_frontmatter(markdown);

			const { sections } = parse({
				body,
				file,
				// gross hack to accommodate FAQ
				slug: dir === 'faq' ? slug : undefined,
				code: () => '',
				codespan: () => ''
			});

			return {
				slug: match[1],
				title: metadata.title,
				sections
			};
		})
		.filter(Boolean);
}

/**
 * @param {{
 *   body: string;
 *   file: string;
 *   slug: string;
 *   code: (source: string, language: string, current: string) => string;
 *   codespan: (source: string) => string;
 * }} opts
 */
function parse({ body, file, slug, code, codespan }) {
	const headings = slug ? [slug] : [];
	const sections = [];

	let section;

	// this is a bit hacky, but it allows us to prevent type declarations
	// from linking to themselves
	let current = '';

	const content = transform(body, {
		heading(html, level) {
			const title = html
				.replace(/<\/?code>/g, '')
				.replace(/&quot;/g, '"')
				.replace(/&lt;/g, '<')
				.replace(/&gt;/g, '>');

			current = title;

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
		code: (source, language) => code(source, language, current),
		codespan
	});

	return {
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
