import { base as app_base } from '$app/paths';
import { modules } from '$lib/generated/type-info.js';
import {
	escape,
	extractFrontmatter,
	markedTransform,
	normalizeSlugify,
	removeMarkdown,
	replaceExportTypePlaceholders
} from '@sveltejs/site-kit/markdown';
import { readFile, readdir } from 'node:fs/promises';
import { CONTENT_BASE_PATHS } from '../../../constants.js';
import { render_content } from '../renderer';

/**
 * @param {import('./types.js').DocsData} docs_data
 * @param {string} slug
 */
export async function get_parsed_docs(docs_data, slug) {
	for (const { pages } of docs_data) {
		for (const page of pages) {
			if (page.slug === slug) {
				return {
					...page,
					content: await render_content(page.file, page.content)
				};
			}
		}
	}
}

/** @return {Promise<import('./types.js').DocsData>} */
export async function get_docs_data(base = CONTENT_BASE_PATHS.DOCS) {
	/** @type {import('./types.js').DocsData} */
	const docs_data = [];

	for (const category_dir of await readdir(base)) {
		const match = /\d{2}-(.+)/.exec(category_dir);
		if (!match) continue;

		const category_slug = match[1];

		// Read the meta.json
		const { title: category_title, draft = 'false' } = JSON.parse(
			await readFile(`${base}/${category_dir}/meta.json`, 'utf-8')
		);

		if (draft === 'true') continue;

		/** @type {import('./types.js').Category} */
		const category = {
			title: category_title,
			slug: category_slug,
			pages: []
		};

		for (const page_md of (await readdir(`${base}/${category_dir}`)).filter(
			(filename) => filename !== 'meta.json'
		)) {
			const match = /\d{2}-(.+)/.exec(page_md);
			if (!match) continue;

			const page_slug = match[1].replace('.md', '');

			const page_data = extractFrontmatter(
				await readFile(`${base}/${category_dir}/${page_md}`, 'utf-8')
			);

			if (page_data.metadata.draft === 'true') continue;

			const page_title = page_data.metadata.title;
			const page_content = page_data.body;

			category.pages.push({
				title: page_title,
				slug: page_slug,
				content: page_content,
				category: category_title,
				sections: await get_sections(page_content),
				path: `${app_base}/docs/${page_slug}`,
				file: `${category_dir}/${page_md}`
			});
		}

		docs_data.push(category);
	}

	return docs_data;
}

/** @param {import('./types.js').DocsData} docs_data */
export function get_docs_list(docs_data) {
	return docs_data.map((category) => ({
		title: category.title,
		pages: category.pages.map((page) => ({
			title: page.title,
			path: page.path
		}))
	}));
}

/** @param {string} markdown */
async function get_sections(markdown) {
	const headingRegex = /^##\s+(.*)$/gm;
	/** @type {import('./types.js').Section[]} */
	const secondLevelHeadings = [];
	let match;

	const placeholders_rendered = await replaceExportTypePlaceholders(markdown, modules);

	while ((match = headingRegex.exec(placeholders_rendered)) !== null) {
		secondLevelHeadings.push({
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

	return secondLevelHeadings;
}
