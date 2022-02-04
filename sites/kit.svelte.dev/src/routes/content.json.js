import fs from 'fs';
import { extract_frontmatter, transform } from '$lib/docs/markdown';
import { slugify } from '../lib/docs';

const pages = [
	{ slug: 'docs', label: null },
	{ slug: 'faq', label: 'FAQ' },
	{ slug: 'migrating', label: 'Migrating' }
];

export function get() {
	const blocks = [];

	for (const page of pages) {
		const breadcrumbs = page.label ? [page.label] : [];

		for (const file of fs.readdirSync(`../../documentation/${page.slug}`)) {
			if (!/\d{2}-.+\.md/.test(file)) continue;

			const filepath = `../../documentation/${page.slug}/${file}`;
			const markdown = fs.readFileSync(filepath, 'utf-8');

			const { body, metadata } = extract_frontmatter(markdown);

			const sections = body.trim().split(/^### /m);

			const intro = sections.shift().trim();

			if (intro) {
				blocks.push({
					breadcrumbs: [...breadcrumbs, metadata.title],
					href: `/${page.slug}#${slugify(metadata.title)}`,
					content: plaintext(intro)
				});
			}

			for (const section of sections) {
				const lines = section.split('\n');
				const h3 = lines.shift();
				const content = lines.join('\n');

				const subsections = content.trim().split('#### ');

				const intro = subsections.shift().trim();

				if (intro) {
					blocks.push({
						breadcrumbs: [...breadcrumbs, metadata.title, h3],
						href: `/${page.slug}#${slugify(metadata.title)}-${slugify(h3)}`,
						content: plaintext(intro)
					});
				}

				for (const subsection of subsections) {
					const lines = subsection.split('\n');
					const h4 = lines.shift();

					blocks.push({
						breadcrumbs: [...breadcrumbs, metadata.title, h3, h4],
						href: `/${page.slug}#${slugify(metadata.title)}-${slugify(h3)}-${slugify(h4)}`,
						content: plaintext(lines.join('\n').trim())
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
		table: () => {
			throw new Error('TODO implement tables');
		},
		tablerow: () => {
			throw new Error('TODO implement tables');
		},
		tablecell: () => {
			throw new Error('TODO implement tables');
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
