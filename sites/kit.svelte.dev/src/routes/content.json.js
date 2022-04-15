import fs from 'fs';
import { extract_frontmatter, transform } from '$lib/docs/server/markdown';
import { render_modules } from '$lib/docs/server/modules';
import { slugify } from '../lib/docs/server';

const categories = [
	{
		slug: 'docs',
		label: null,
		href: (parts) =>
			parts.length > 1 ? `/docs/${parts[0]}#${parts.slice(1).join('-')}` : `/docs/${parts[0]}`
	},
	{
		slug: 'faq',
		label: 'FAQ',
		href: (parts) => `/faq#${parts.join('-')}`
	}
];

export function get() {
	const blocks = [];

	for (const category of categories) {
		const breadcrumbs = category.label ? [category.label] : [];

		for (const file of fs.readdirSync(`../../documentation/${category.slug}`)) {
			const match = /\d{2}-(.+)\.md/.exec(file);
			if (!match) continue;

			const slug = match[1];

			const filepath = `../../documentation/${category.slug}/${file}`;
			const markdown = fs
				.readFileSync(filepath, 'utf-8')
				.replace('**TYPES**', () => render_modules('types'))
				.replace('**EXPORTS**', () => render_modules('exports'));

			const { body, metadata } = extract_frontmatter(markdown);

			const sections = body.trim().split(/^### /m);
			const intro = sections.shift().trim();
			const rank = +metadata.rank || undefined;

			blocks.push({
				breadcrumbs: [...breadcrumbs, metadata.title],
				href: category.href([slug]),
				content: plaintext(intro),
				rank
			});

			for (const section of sections) {
				const lines = section.split('\n');
				const h3 = lines.shift();
				const content = lines.join('\n');

				const subsections = content.trim().split('#### ');

				const intro = subsections.shift().trim();

				blocks.push({
					breadcrumbs: [...breadcrumbs, metadata.title, h3],
					href: category.href([slug, slugify(h3)]),
					content: plaintext(intro),
					rank
				});

				for (const subsection of subsections) {
					const lines = subsection.split('\n');
					const h4 = lines.shift();

					blocks.push({
						breadcrumbs: [...breadcrumbs, metadata.title, h3, h4],
						href: category.href([slug, slugify(h3), slugify(h4)]),
						content: plaintext(lines.join('\n').trim()),
						rank
					});
				}
			}
		}
	}

	return {
		body: {
			blocks
		}
	};
}

function plaintext(markdown) {
	const block = (text) => `${text}\n`;
	const inline = (text) => text;

	return transform(markdown, {
		code: block,
		blockquote: block,
		html: () => {
			throw new Error('TODO implement HTML');
		},
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
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&#(\d+);/g, (match, code) => {
			return String.fromCharCode(code);
		})
		.trim();
}
