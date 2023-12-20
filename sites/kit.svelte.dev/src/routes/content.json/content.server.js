import { modules } from '$lib/generated/type-info.js';
import {
	extractFrontmatter,
	markedTransform,
	replaceExportTypePlaceholders,
	slugify
} from '@sveltejs/site-kit/markdown';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import glob from 'tiny-glob';

const categories = [
	{
		slug: 'docs',
		label: null,
		href: (parts) =>
			parts.length > 1 ? `/docs/${parts[0]}#${parts.slice(1).join('-')}` : `/docs/${parts[0]}`
	}
];

export async function content() {
	/** @type {import('@sveltejs/site-kit/search').Block[]} */
	const blocks = [];

	for (const category of categories) {
		const breadcrumbs = category.label ? [category.label] : [];

		for (const file of await glob('**/*.md', { cwd: `../../documentation/${category.slug}` })) {
			const basename = path.basename(file);
			const match = /\d{2}-(.+)\.md/.exec(basename);
			if (!match) continue;

			const slug = match[1];

			const filepath = `../../documentation/${category.slug}/${file}`;
			const markdown = await replaceExportTypePlaceholders(
				await readFile(filepath, 'utf-8'),
				modules
			);

			const { body, metadata } = extractFrontmatter(markdown);

			const sections = body.trim().split(/^## /m);
			const intro = sections.shift().trim();
			const rank = +metadata.rank || undefined;

			blocks.push({
				breadcrumbs: [...breadcrumbs, metadata.title],
				href: category.href([slug]),
				content: await plaintext(intro),
				rank
			});

			for (const section of sections) {
				const lines = section.split('\n');
				const h3 = lines.shift();
				const content = lines.join('\n');

				const subsections = content.trim().split('### ');

				const intro = subsections.shift().trim();

				blocks.push({
					breadcrumbs: [...breadcrumbs, metadata.title, h3],
					href: category.href([slug, slugify(h3)]),
					content: await plaintext(intro),
					rank
				});

				for (const subsection of subsections) {
					const lines = subsection.split('\n');
					const h4 = lines.shift();

					blocks.push({
						breadcrumbs: [...breadcrumbs, metadata.title, h3, h4],
						href: category.href([slug, slugify(h3), slugify(h4)]),
						content: await plaintext(lines.join('\n').trim()),
						rank
					});
				}
			}
		}
	}

	return blocks;
}

/** @param {string} markdown  */
async function plaintext(markdown) {
	const block = (text) => `${text}\n`;
	const inline = (text) => text;

	return (
		await markedTransform(markdown, {
			code: (source) =>
				source
					.split('// ---cut---\n')
					.pop()
					.replace(/^\/\/((\/ file:)|( @errors:))[\s\S]*/gm, ''),
			blockquote: block,
			html: () => '\n',
			heading: (text) => `${text}\n`,
			hr: () => '',
			list: block,
			listitem: block,
			checkbox: block,
			paragraph: (text) => `${text}\n\n`,
			table: block,
			tablerow: block,
			tablecell: (text, opts) => {
				return text + ' ';
			},
			strong: inline,
			em: inline,
			codespan: inline,
			br: () => '',
			del: inline,
			link: (href, title, text) => text,
			image: (href, title, text) => text,
			text: inline
		})
	)
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&#(\d+);/g, (match, code) => {
			return String.fromCharCode(code);
		})
		.trim();
}
