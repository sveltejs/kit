#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { bold, cyan, gray, green, red } from 'kleur/colors';
import prompts from 'prompts';
import { create } from './index.js';
import { dist } from './utils.js';

// prettier-ignore
const disclaimer = `
${bold(cyan('Welcome to SvelteKit!'))}

${bold(red('This is beta software; expect bugs and missing features.'))}

Problems? Open an issue on ${cyan('https://github.com/sveltejs/kit/issues')} if none exists already.
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
						const meta = JSON.parse(fs.readFileSync(meta_file, 'utf8'));

						return {
							title: meta.description,
							value: dir
						};
					})
				},
				{
					type: 'toggle',
					name: 'typescript',
					message: 'Use TypeScript?',
					initial: false,
					active: 'Yes',
					inactive: 'No'
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

	if (options.typescript) {
		console.log(bold('✔ Typescript'));
		console.log('  Inside Svelte components, use <script lang="ts">');
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

	console.log('\nInstall community-maintained integrations:');
	console.log(cyan('  https://github.com/svelte-add/svelte-adders'));

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
	console.log(`\nStuck? Visit us at ${cyan('https://svelte.dev/chat')}\n`);
}

main();
