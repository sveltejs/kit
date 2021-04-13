import fs from 'fs';
import path from 'path';
import parser from 'gitignore-parser';
import prettier from 'prettier';
import { transform } from 'sucrase';
import glob from 'tiny-glob/sync.js';

async function generate_templates() {
	const templates = fs.readdirSync('templates');

	try {
		fs.mkdirSync('dist/templates', { recursive: true });
	} catch {
		// ignore
	}

	for (const name of templates) {
		const cwd = path.resolve('templates', name);

		const gitignore_file = path.join(cwd, '.gitignore');
		if (!fs.existsSync(gitignore_file)) throw new Error('Template must have a .gitignore file');
		const gitignore = parser.compile(fs.readFileSync(gitignore_file, 'utf-8') + '\n/.meta.json');

		const meta_file = path.join(cwd, '.meta.json');
		if (!fs.existsSync(meta_file)) throw new Error('Template must have a .meta.json file');
		const meta = JSON.parse(fs.readFileSync(meta_file, 'utf-8'));

		const ts = {
			meta,
			files: glob('**/*', { cwd, filesOnly: true })
				.filter(gitignore.accepts)
				.map((name) => {
					const encoding = /\.(ico|png|jpe?g)$/.test(name) ? 'base64' : 'utf8';
					let contents = fs.readFileSync(path.join(cwd, name), encoding);

					if (name === 'package.json') {
						// TODO package-specific versions
						contents = contents.replace(/workspace:\*/g, 'next');
					}

					return {
						name,
						contents,
						encoding
					};
				})
		};

		const js = { meta, files: [] };

		for (const file of ts.files) {
			if (file.name.endsWith('.d.ts')) continue;

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

				js.files.push({
					name: file.name.replace(/\.ts$/, '.js'),
					contents
				});
			} else if (file.name.endsWith('.svelte')) {
				const contents = file.contents.replace(
					/<script([^>]+)>([\s\S]+)<\/script>/g,
					(m, attrs, typescript) => {
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

				js.files.push({
					name: file.name,
					contents
				});
			} else {
				js.files.push(file);
			}
		}

		fs.writeFileSync(`dist/templates/${name}-ts.json`, JSON.stringify(ts, null, '\t'));
		fs.writeFileSync(`dist/templates/${name}-js.json`, JSON.stringify(js, null, '\t'));
	}
}

async function generate_common() {
	const cwd = path.resolve('shared');

	const files = glob('**/*', { cwd, filesOnly: true, dot: true })
		.map((file) => {
			const [conditions, ...rest] = file.split('/');

			const include = [];
			const exclude = [];

			const pattern = /([+-])([a-z]+)/g;
			let match;
			while ((match = pattern.exec(conditions))) {
				const set = match[1] === '+' ? include : exclude;
				set.push(match[2]);
			}

			return {
				name: rest.join('/'),
				include,
				exclude,
				contents: fs.readFileSync(path.join(cwd, file), 'utf8')
			};
		})
		.sort((a, b) => a.include.length + a.exclude.length - (b.include.length + b.exclude.length));

	fs.writeFileSync('dist/shared.json', JSON.stringify({ files }, null, '\t'));
}

async function main() {
	await generate_templates();
	await generate_common();
}

main();
