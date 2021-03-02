import fs, { readFileSync } from 'fs';
import { dirname, join, resolve as resolve_path, sep as path_separator } from 'path';
import { parse, pathToFileURL, resolve, URLSearchParams } from 'url';
import glob from 'tiny-glob/sync.js';
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

export async function prerender({ dir, out, log, config, force }) {
	const seen = new Set();

	const server_root = resolve_path(dir);
	const app = await import(pathToFileURL(`${server_root}/server/app.js`));

	app.init({
		paths: config.kit.paths
	});

	const error = config.kit.prerender.force
		? (status, path) => {
				log.error(`${status} ${path}`);
		  }
		: (status, path) => {
				throw new Error(`${status} ${path}`);
		  };

	async function visit(path) {
		if (seen.has(path)) return;
		seen.add(path);

		const rendered = await app.render(
			{
				host: config.kit.host,
				method: 'GET',
				headers: {},
				path,
				body: null,
				query: new URLSearchParams()
			},
			{
				local: true,
				only_prerender: !force,
				get_static_file: (file) => readFileSync(join(config.kit.files.assets, file))
			}
		);

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
				const { location } = headers;

				log.warn(`${rendered.status} ${path} -> ${location}`);
				fs.writeFileSync(
					file,
					`<meta http-equiv="refresh" content="0;url=${encodeURI(location)}">`
				);

				return;
			}

			if (response_type === OK) {
				log.info(`${rendered.status} ${path}`);
				fs.writeFileSync(file, rendered.body); // TODO minify where possible?
			} else {
				error(rendered.status, path);
			}

			const { dependencies } = rendered;

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
						error(result.status, path);
					}
				}
			}

			if (is_html && config.kit.prerender.crawl) {
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

						const file = parsed.pathname.replace(config.kit.paths.assets, '');

						const file_exists =
							(file.startsWith(`/${config.kit.appDir}/`) &&
								fs.existsSync(`${dir}/client/${file}`)) ||
							fs.existsSync(`${out}/${file}`) ||
							fs.existsSync(`${config.kit.files.static}/${file}`) ||
							fs.existsSync(`${config.kit.files.static}/${file}/index.html`);

						if (file_exists) continue;

						if (parsed.query) {
							// TODO warn that query strings have no effect on statically-exported pages
						}

						await visit(parsed.pathname.replace(config.kit.paths.base, ''));
					}
				}
			}
		}
	}

	for (const entry of config.kit.prerender.pages) {
		if (entry === '*') {
			// remove the prefix '.' from the extensions array
			const extensions = config.kit.extensions.map((extension) => extension.slice(1));
			const extensions_regex = new RegExp(`\\.(${extensions.join('|')})$`);
			const entries = glob(`**/*.{${extensions.join(',')}}`, { cwd: config.kit.files.routes })
				.map((file) => {
					// support both windows and unix glob results
					const parts = file.split(path_separator);

					if (parts.some((part) => part[0] === '_' || /\[/.test(part))) {
						return null;
					}

					parts[parts.length - 1] = parts[parts.length - 1].replace(extensions_regex, '');
					if (parts[parts.length - 1] === 'index') parts.pop();

					if (parts[parts.length - 1] === '$layout' || parts[parts.length - 1] == '$error') {
						return null;
					}

					return `/${parts.join('/')}`;
				})
				.filter(Boolean);

			for (const entry of entries) {
				await visit(entry);
			}
		} else {
			await visit(entry);
		}
	}
}
