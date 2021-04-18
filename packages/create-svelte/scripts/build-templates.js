import fs from 'fs';
import path from 'path';
import parser from 'gitignore-parser';
import prettier from 'prettier';
import { transform } from 'sucrase';
import glob from 'tiny-glob/sync.js';
import { mkdirp, rimraf } from '../utils.js';

const ignored = new Set(['.meta.json', 'package.json']);

/** @param {Set<string>} shared */
async function generate_templates(shared) {
	const templates = fs.readdirSync('templates');

	for (const template of templates) {
		const dir = `dist/templates/${template}`;
		const assets = `${dir}/assets`;
		mkdirp(assets);

		const cwd = path.resolve('templates', template);

		const gitignore_file = path.join(cwd, '.gitignore');
		if (!fs.existsSync(gitignore_file)) throw new Error('Template must have a .gitignore file');
		const gitignore = parser.compile(fs.readFileSync(gitignore_file, 'utf-8') + '\n/.meta.json');

		const meta_file = path.join(cwd, '.meta.json');
		if (!fs.existsSync(meta_file)) throw new Error('Template must have a .meta.json file');

		/** @type {import('../types/internal.js').File[]} */
		const ts = [];

		glob('**/*', { cwd, filesOnly: true, dot: true }).forEach((name) => {
			if (ignored.has(name) || shared.has(name)) return;
			if (!gitignore.accepts(name)) return;

			// the package.template.json thing is a bit annoying — basically we want
			// to be able to develop and deploy the app from here, but have a different
			// package.json in newly created projects (based on package.template.json)
			if (/\.(js|ts|svelte|svelte\.md)$/.test(name) || name === 'package.template.json') {
				let contents = fs.readFileSync(path.join(cwd, name), 'utf8');

				if (name === 'package.template.json') {
					// TODO package-specific versions
					contents = contents.replace(/workspace:\*/g, 'next');
					fs.writeFileSync(`${dir}/package.json`, contents);
				} else {
					ts.push({
						name,
						contents
					});
				}
			} else {
				const dest = path.join(assets, name);
				mkdirp(path.dirname(dest));
				fs.copyFileSync(path.join(cwd, name), dest);
			}
		});

		/** @type {import('../types/internal.js').File[]} */
		const js = [];

		for (const file of ts) {
			// The global.d.ts file makes TS/JS aware of some ambient modules, which are
			// also needed for JS projects if people turn on "checkJs" in their jsonfig
			if (file.name.endsWith('.d.ts')) {
				if (file.name.endsWith('global.d.ts')) js.push(file);
				continue;
			}

			if (file.name.endsWith('.ts')) {
				const transformed = transform(file.contents, {
					transforms: ['typescript']
				});

				const contents = prettier.format(transformed.code, {
					parser: 'babel',
					useTabs: true,
					singleQuote: true,
					trailingComma: 'none'
				});

				js.push({
					name: file.name.replace(/\.ts$/, '.js'),
					contents
				});
			} else if (file.name.endsWith('.svelte')) {
				// we jump through some hoops, rather than just using svelte.preprocess,
				// so that the output preserves the original formatting to the extent
				// possible (e.g. preserving double line breaks). Sucrase is the best
				// tool for the job because it just removes the types; Prettier then
				// tidies up the end result
				const contents = file.contents.replace(
					/<script([^>]+)>([\s\S]+?)<\/script>/g,
					(m, attrs, typescript) => {
						// Sucrase assumes 'unused' imports (which _are_ used, but only
						// in the markup) are type imports, and strips them. This step
						// prevents it from drawing that conclusion
						const imports = [];
						const import_pattern = /import (.+?) from/g;
						let import_match;
						while ((import_match = import_pattern.exec(typescript))) {
							const word_pattern = /[a-z_$][a-z0-9_$]*/gi;
							let word_match;
							while ((word_match = word_pattern.exec(import_match[1]))) {
								imports.push(word_match[0]);
							}
						}

						const suffix = `\n${imports.join(',')}`;

						const transformed = transform(typescript + suffix, {
							transforms: ['typescript']
						}).code.slice(0, -suffix.length);

						const contents = prettier
							.format(transformed, {
								parser: 'babel',
								useTabs: true,
								singleQuote: true,
								trailingComma: 'none'
							})
							.trim()
							.split('\n')
							.join('\n\t');

						return `<script${attrs.replace(' lang="ts"', '')}>\n\t${contents}\n</script>`;
					}
				);

				js.push({
					name: file.name,
					contents
				});
			} else {
				js.push(file);
			}
		}

		fs.copyFileSync(meta_file, `${dir}/meta.json`);
		fs.writeFileSync(`${dir}/files.ts.json`, JSON.stringify(ts, null, '\t'));
		fs.writeFileSync(`${dir}/files.js.json`, JSON.stringify(js, null, '\t'));
	}
}

async function generate_shared() {
	const cwd = path.resolve('shared');

	/** @type {Set<string>} */
	const shared = new Set();

	const files = glob('**/*', { cwd, filesOnly: true, dot: true })
		.map((file) => {
			const contents = fs.readFileSync(path.join(cwd, file), 'utf8');

			/** @type {string[]} */
			const include = [];

			/** @type {string[]} */
			const exclude = [];

			let name = file;

			if (file.startsWith('+') || file.startsWith('-')) {
				const [conditions, ...rest] = file.split('/');

				const pattern = /([+-])([a-z]+)/g;
				let match;
				while ((match = pattern.exec(conditions))) {
					const set = match[1] === '+' ? include : exclude;
					set.push(match[2]);
				}

				name = rest.join('/');
			}

			shared.add(name);

			return { name, include, exclude, contents };
		})
		.sort((a, b) => a.include.length + a.exclude.length - (b.include.length + b.exclude.length));

	fs.writeFileSync('dist/shared.json', JSON.stringify({ files }, null, '\t'));

	shared.delete('package.json');
	return shared;
}

async function main() {
	rimraf('dist');
	mkdirp('dist');

	const shared = await generate_shared();
	await generate_templates(shared);
}

main();
