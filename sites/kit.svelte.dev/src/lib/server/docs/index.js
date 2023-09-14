import { base } from '$app/paths';
import { modules } from '$lib/generated/type-info.js';
import {
	escape,
	extractFrontmatter,
	markedTransform,
	normalizeSlugify,
	removeMarkdown,
	replaceExportTypePlaceholders
} from '@sveltejs/site-kit/markdown';
import { render_content } from '../renderer';
import { read } from '$app/server';
import { error } from '@sveltejs/kit';
import {
	PUBLIC_SVELTE_SITE_URL,
	PUBLIC_KIT_SITE_URL,
	PUBLIC_LEARN_SITE_URL,
	PUBLIC_GITHUB_ORG
} from '$env/static/public';

const meta = import.meta.glob('../../../../../../documentation/docs/*/meta.json', {
	as: 'url',
	eager: true
});

const markdown = import.meta.glob('../../../../../../documentation/docs/*/*.md', {
	as: 'url',
	eager: true
});

export const categories = {};
export const pages = {};

for (const [file, asset] of Object.entries(meta)) {
	const slug = /\/\d{2}-(.+)\/meta\.json$/.exec(file)[1];

	const { title, draft } = await read(asset).json();

	if (draft) continue;

	categories[slug] = {
		title,
		pages: []
	};
}

for (const [file, asset] of Object.entries(markdown)) {
	const [, category_dir, basename] = /\/(\d{2}-.+?)\/(\d{2}-.+\.md)$/.exec(file);
	const category_slug = category_dir.slice(3);
	const slug = basename.slice(3, -3); // strip the number prefix and .md suffix

	const category = categories[category_slug];
	if (!category) continue; // draft

	const {
		metadata: { draft, title, rank },
		body
	} = extractFrontmatter(await read(asset).text());

	if (draft === 'true') continue;

	category.pages.push({
		title,
		path: `${base}/docs/${slug}`
	});

	const content = body
		.replace(/PUBLIC_SVELTE_SITE_URL/g, PUBLIC_SVELTE_SITE_URL)
		.replace(/PUBLIC_KIT_SITE_URL/g, PUBLIC_KIT_SITE_URL)
		.replace(/PUBLIC_LEARN_SITE_URL/g, PUBLIC_LEARN_SITE_URL)
		.replace(/PUBLIC_GITHUB_ORG/g, PUBLIC_GITHUB_ORG);

	pages[slug] = {
		rank: +rank || undefined,
		category: category.title,
		title,
		file: `${category_dir}/${basename}`,
		sections: await get_sections(content),
		body: content
	};
}

/** @param {string} slug */
export async function get_parsed_docs(slug) {
	const page = pages[slug];
	if (!page) error(404);

	// TODO this should probably use a type from site-kit
	return {
		category: page.category,
		title: page.title,
		file: page.file,
		sections: page.sections,
		content: await render_content(page.file, page.body)
	};
}

export function get_docs_list() {
	return Object.values(categories);
}

/** @param {string} markdown */
async function get_sections(markdown) {
	/** @type {import('./types.js').Section[]} */
	const second_level_headings = [];

	const pattern = /^##\s+(.*)$/gm;
	let match;

	const placeholders_rendered = await replaceExportTypePlaceholders(markdown, modules);

	while ((match = pattern.exec(placeholders_rendered)) !== null) {
		second_level_headings.push({
			title: removeMarkdown(
				escape(await markedTransform(match[1], { paragraph: (txt) => txt }))
					.replace(/<\/?code>/g, '')
					.replace(/&#39;/g, "'")
					.replace(/&quot;/g, '"')
					.replace(/&lt;/g, '<')
					.replace(/&gt;/g, '>')
					.replace(/<(\/)?(em|b|strong|code)>/g, '')
			),
			slug: normalizeSlugify(match[1])
		});
	}

	return second_level_headings;
}
