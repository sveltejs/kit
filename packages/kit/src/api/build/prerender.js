import fs from 'fs';
import { dirname, resolve as resolve_path } from 'path';
import { parse, resolve, URLSearchParams } from 'url';
import { mkdirp } from '@sveltejs/app-utils/files';

function clean_html(html) {
	return html
		.replace(/<!\[CDATA\[[\s\S]*?\]\]>/gm, '')
		.replace(/(<script[\s\S]*?>)[\s\S]*?<\/script>/gm, '$1</' + 'script>')
		.replace(/(<style[\s\S]*?>)[\s\S]*?<\/style>/gm, '$1</' + 'style>')
		.replace(/<!--[\s\S]*?-->/gm, '');
}

function get_href(attrs) {
	const match = /href\s*=\s*(?:"(.*?)"|'(.*?)'|([^\s>]*))/.exec(attrs);
	return match && (match[1] || match[2] || match[3]);
}

function get_src(attrs) {
	const match = /src\s*=\s*(?:"(.*?)"|'(.*?)'|([^\s>]*))/.exec(attrs);
	return match && (match[1] || match[2] || match[3]);
}

function get_srcset_urls(attrs) {
	const results = [];
	// Note that the srcset allows any ASCII whitespace, including newlines.
	const match = /srcset\s*=\s*(?:"(.*?)"|'(.*?)'|([^\s>]*))/s.exec(attrs);
	if (match) {
		const attr_content = match[1] || match[2] || match[3];
		// Parse the content of the srcset attribute.
		// The regexp is modelled after the srcset specs (https://html.spec.whatwg.org/multipage/images.html#srcset-attribute)
		// and should cover most reasonable cases.
		const regex = /\s*([^\s,]\S+[^\s,])\s*((?:\d+w)|(?:-?\d+(?:\.\d+)?(?:[eE]-?\d+)?x))?/gm;
		let sub_matches;
		while ((sub_matches = regex.exec(attr_content))) {
			results.push(sub_matches[1]);
		}
	}
	return results;
}

const OK = 2;
const REDIRECT = 3;

export async function prerender({
	dir,
	out,
	manifest,
	log
}) {
	const seen = new Set();

	const server_root = resolve_path(dir);
	const app = require(`${server_root}/server/app.js`);

	async function crawl(path) {
		if (seen.has(path)) return;
		seen.add(path);

		const rendered = await app.render({
			host: null, // TODO ???
			method: 'GET',
			headers: {},
			path,
			body: null,
			query: new URLSearchParams()
		});

		if (rendered) {
			const response_type = Math.floor(rendered.status / 100);
			const headers = rendered.headers;
			const type = headers && headers['content-type'];
			const is_html = response_type === REDIRECT || type === 'text/html';

			const parts = path.split('/');
			if (is_html && parts[parts.length - 1] !== 'index.html') {
				parts.push('index.html');
			}

			const file = `${out}${parts.join('/')}`;
			mkdirp(dirname(file));

			if (response_type === REDIRECT) {
				const location = headers['location'];

				log.warn(`${rendered.status} ${path} -> ${location}`);
				fs.writeFileSync(
					file,
					`<script>window.location.href=${JSON.stringify(headers['location'])}</script>`
				);

				return;
			}

			if (response_type === OK) {
				log.info(`${rendered.status} ${path}`);
				fs.writeFileSync(file, rendered.body); // TODO minify where possible?
			} else {
				// TODO should this fail the build?
				log.error(`${rendered.status} ${path}`);
			}

			const { dependencies } = rendered ;

			if (dependencies) {
				for (const path in dependencies) {
					const result = dependencies[path];
					const response_type = Math.floor(result.status / 100);

					const is_html = result.headers['content-type'] === 'text/html';

					const parts = path.split('/');
					if (is_html && parts[parts.length - 1] !== 'index.html') {
						parts.push('index.html');
					}

					const file = `${out}${parts.join('/')}`;
					mkdirp(dirname(file));

					fs.writeFileSync(file, result.body);

					if (response_type === OK) {
						log.info(`${result.status} ${path}`);
					} else {
						log.error(`${result.status} ${path}`);
					}
				}
			}

			if (is_html) {
				const cleaned = clean_html(rendered.body);

				let match;
				const pattern = /<(a|img|link|source)\s+([\s\S]+?)>/gm;

				while ((match = pattern.exec(cleaned))) {
					let hrefs = [];
					const element = match[1];
					const attrs = match[2];

					if (element === 'a' || element === 'link') {
						hrefs.push(get_href(attrs));
					} else {
						if (element === 'img') {
							hrefs.push(get_src(attrs));
						}
						hrefs.push(...get_srcset_urls(attrs));
					}

					hrefs = hrefs.filter(Boolean);

					for (const href of hrefs) {
						const resolved = resolve(path, href);
						if (resolved[0] !== '/') continue;

						const parsed = parse(resolved);

						const parts = parsed.pathname.slice(1).split('/').filter(Boolean);
						if (parts[parts.length - 1] === 'index.html') parts.pop();

						const file_exists =
							(parsed.pathname.startsWith('/_app/') && fs.existsSync(`${dir}/client/${parsed.pathname.replace('/_app/', '')}`)) ||
							fs.existsSync(`${out}${parsed.pathname}`) ||
							fs.existsSync(`static${parsed.pathname}`) ||
							fs.existsSync(`static${parsed.pathname}/index.html`);

						if (file_exists) continue;

						if (parsed.query) {
							// TODO warn that query strings have no effect on statically-exported pages
						}

						await crawl(parsed.pathname);
					}
				}
			}
		}
	}

	const entries = manifest.pages.map((page) => page.path).filter(Boolean);

	for (const entry of entries) {
		await crawl(entry);
	}
}
