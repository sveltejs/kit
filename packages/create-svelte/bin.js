#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { bold, cyan, gray, green, yellow } from 'kleur/colors';
import prompts from 'prompts';
import { create } from './index.js';
import { dist } from './utils.js';

// prettier-ignore
const disclaimer = `
${bold(cyan('Welcome to SvelteKit!'))}
`;

const { version } = JSON.parse(fs.readFileSync(new URL('package.json', import.meta.url), 'utf-8'));

async function main() {
	console.log(gray(`\ncreate-svelte version ${version}`));
	console.log(disclaimer);

	let cwd = process.argv[2] || '.';

	if (cwd === '.') {
		const opts = await prompts([
			{
				type: 'text',
				name: 'dir',
				message: 'Where should we create your project?\n  (leave blank to use current directory)'
			}
		]);

		if (opts.dir) {
			cwd = opts.dir;
		}
	}

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
	}

	const options = /** @type {import('./types/internal').Options} */ (
		await prompts(
			[
				{
					type: 'select',
					name: 'template',
					message: 'Which Svelte app template?',
					choices: fs.readdirSync(dist('templates')).map((dir) => {
						const meta_file = dist(`templates/${dir}/meta.json`);
						const { title, description } = JSON.parse(fs.readFileSync(meta_file, 'utf8'));

						return {
							title,
							description,
							value: dir
						};
					})
				},
				{
					type: 'select',
					name: 'types',
					message: 'Add type checking with TypeScript?',
					initial: false,
					choices: [
						{
							title: 'Yes, using JavaScript with JSDoc comments',
							value: 'checkjs'
						},
						{
							title: 'Yes, using TypeScript syntax',
							value: 'typescript'
						},
						{ title: 'No', value: null }
					]
				},
				{
					type: 'toggle',
					name: 'eslint',
					message: 'Add ESLint for code linting?',
					initial: false,
					active: 'Yes',
					inactive: 'No'
				},
				{
					type: 'toggle',
					name: 'prettier',
					message: 'Add Prettier for code formatting?',
					initial: false,
					active: 'Yes',
					inactive: 'No'
				},
				{
					type: 'toggle',
					name: 'playwright',
					message: 'Add Playwright for browser testing?',
					initial: false,
					active: 'Yes',
					inactive: 'No'
				},
				{
					type: 'toggle',
					name: 'vitest',
					message: 'Add Vitest for unit testing?',
					initial: false,
					active: 'Yes',
					inactive: 'No'
				}
			],
			{
				onCancel: () => {
					process.exit(1);
				}
			}
		)
	);

	options.name = path.basename(path.resolve(cwd));

	await create(cwd, options);

	console.log(bold(green('\nYour project is ready!')));

	if (options.types === 'typescript') {
		console.log(bold('✔ Typescript'));
		console.log('  Inside Svelte components, use <script lang="ts">');
	} else if (options.types === 'checkjs') {
		console.log(bold('✔ Type-checked JavaScript'));
		console.log('  https://www.typescriptlang.org/tsconfig#checkJs');
	} else if (options.template === 'skeletonlib') {
		const warning = yellow('▲');
		console.log(
			`${warning} You chose to not add type checking, but TypeScript will still be installed in order to generate type definitions when building the library`
		);
	}

	if (options.eslint) {
		console.log(bold('✔ ESLint'));
		console.log(cyan('  https://github.com/sveltejs/eslint-plugin-svelte3'));
	}

	if (options.prettier) {
		console.log(bold('✔ Prettier'));
		console.log(cyan('  https://prettier.io/docs/en/options.html'));
		console.log(cyan('  https://github.com/sveltejs/prettier-plugin-svelte#options'));
	}

	if (options.playwright) {
		console.log(bold('✔ Playwright'));
		console.log(cyan('  https://playwright.dev'));
	}

	if (options.vitest) {
		console.log(bold('✔ Vitest'));
		console.log(cyan('  https://vitest.dev'));
	}

	console.log('\nInstall community-maintained integrations:');
	console.log(cyan('  https://github.com/svelte-add/svelte-add'));

	console.log('\nNext steps:');
	let i = 1;

	const relative = path.relative(process.cwd(), cwd);
	if (relative !== '') {
		console.log(`  ${i++}: ${bold(cyan(`cd ${relative}`))}`);
	}

	console.log(`  ${i++}: ${bold(cyan('npm install'))} (or pnpm install, etc)`);
	// prettier-ignore
	console.log(`  ${i++}: ${bold(cyan('git init && git add -A && git commit -m "Initial commit"'))} (optional)`);
	console.log(`  ${i++}: ${bold(cyan('npm run dev -- --open'))}`);

	console.log(`\nTo close the dev server, hit ${bold(cyan('Ctrl-C'))}`);
	console.log(`\nStuck? Visit us at ${cyan('https://svelte.dev/chat')}`);
}

main();
