//eslint-disable-next-line import/no-unresolved
import fs from 'fs';
import path from 'path';
import { mkdirp } from '@sveltejs/kit/filesystem';
import { bold, cyan, gray, green, red } from 'kleur/colors';
import prompts from 'prompts/lib/index';
import add_typescript from './modifications/add_typescript';
import add_prettier from './modifications/add_prettier';
import add_eslint from './modifications/add_eslint';
import { fileURLToPath } from 'url';
import { version } from '../package.json';

const disclaimer = `
Welcome to the SvelteKit setup wizard!

SvelteKit is in public beta now. There are definitely bugs and some feature might not work yet.
If you encounter an issue, have a look at https://github.com/sveltejs/kit/issues and open a new one, if it is not already tracked.
`;

const modifiers = [add_typescript, add_eslint, add_prettier];

async function main() {
	console.log(gray(`\ncreate-svelte version ${version}`));
	console.log(red(disclaimer));

	const cwd = process.argv[2] || '.';

	if (fs.existsSync(cwd)) {
		if (fs.readdirSync(cwd).length > 0) {
			const response = await prompts({
				type: 'confirm',
				name: 'value',
				message: 'Directory not empty. Continue?',
				initial: false
			});

			if (!response.value) {
				process.exit(1);
			}
		}
	} else {
		mkdirp(cwd);
	}

	const options = /** @type {import('./types').Options} */ (await prompts([
		{
			type: 'confirm',
			name: 'typescript',
			message: 'Use TypeScript?',
			initial: false
		},
		{
			type: 'confirm',
			name: 'eslint',
			message: 'Add ESLint for code linting?',
			initial: false
		},
		{
			type: 'confirm',
			name: 'prettier',
			message: 'Add Prettier for code formatting?',
			initial: false
		}
	]));

	const name = path.basename(path.resolve(cwd));

	instantiate(`default-${options.typescript ? 'ts' : 'js'}`, name, cwd);

	console.log(bold(green('✔ Copied project files')));

	for (const modifier of modifiers) {
		await modifier(cwd, options);
	}

	console.log(
		'\nWant to add other parts to your code base? ' +
			'Visit https://github.com/svelte-add/svelte-adders, a community project of commands ' +
			'to add particular functionality to Svelte projects\n'
	);

	console.log('\nNext steps:');
	let i = 1;

	const relative = path.relative(process.cwd(), cwd);
	if (relative !== '') {
		console.log(`  ${i++}: ${bold(cyan(`cd ${relative}`))}`);
	}

	console.log(`  ${i++}: ${bold(cyan('npm install'))} (or pnpm install, or yarn)`);
	console.log(`  ${i++}: ${bold(cyan('npm run dev -- --open'))}`);

	console.log(`\nTo close the dev server, hit ${bold(cyan('Ctrl-C'))}`);
	console.log('\nStuck? Visit us at https://svelte.dev/chat\n');
}

/**
 * @param {string} id
 * @param {string} name
 * @param {string} cwd
 */
function instantiate(id, name, cwd) {
	const template = fileURLToPath(new URL(`./dist/${id}.json`, import.meta.url).href);
	const files = /** @type {Array<{ name: string, contents: string, encoding: 'base64' | 'utf8'}>} */ (JSON.parse(
		fs.readFileSync(template, 'utf-8')
	));

	files.forEach((file) => {
		const dest = path.join(cwd, file.name);
		mkdirp(path.dirname(dest));

		fs.writeFileSync(
			dest,
			file.encoding === 'base64'
				? Buffer.from(file.contents, 'base64')
				: file.contents.replace(/~TODO~/g, name)
		);
	});
}

main();
