#!/usr/bin/env node
import fs from 'fs';
import { bold, cyan, gray, green, red } from 'kleur/colors';
import path from 'path';
import prompts from 'prompts';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
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
	if (cwd.startsWith('--')) cwd = '.';

	/**
	 * @typedef {object} params
	 * @property {string} $0
	 * @property {(string|number)[]} _
	 * @property {string=} template
	 * @property {string=} types
	 * @property {string=} eslint
	 * @property {string=} prettier
	 * @property {string=} playwright
	 * @property {string=} overwrite
	 */
	/** @type {params} */
	const params = await yargs(hideBin(process.argv)).argv;

	const overrides = Object.fromEntries([
		...(params?.template === undefined
			? []
			: [
					[
						'template',
						fs.readdirSync(dist('templates')).includes(params?.template)
							? params?.template
							: 'default'
					]
			  ]),
		...(params?.types === undefined
			? []
			: [['types', ['checkjs', 'typescript'].includes(params?.types) ? params?.types : null]]),
		...(params?.eslint === undefined ? [] : [['eslint', params?.eslint === 'true']]),
		...(params?.prettier === undefined ? [] : [['prettier', params?.prettier === 'true']]),
		...(params?.playwright === undefined ? [] : [['playwright', params?.playwright === 'true']]),
		...(params?.overwrite === undefined ? [] : [['overwrite', params?.overwrite === 'true']])
	]);
	prompts.override(overrides);

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
				name: 'overwrite',
				message: 'Directory not empty. Continue?',
				initial: false
			});

			if (!response.overwrite) {
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

	console.log(bold(green('\nYour project is ready!\n')));

	if (overrides.template) {
		const { title, description } = JSON.parse(
			fs.readFileSync(dist(`templates/${options.template}/meta.json`), 'utf8')
		);
		console.log(bold(`✔ ${title}`));
		console.log(`  ${description}`);
	}

	if (options.types === 'typescript') {
		console.log(bold('✔ Typescript'));
		console.log('  Inside Svelte components, use <script lang="ts">');
	} else if (options.types === 'checkjs') {
		console.log(bold('✔ Type-checked JavaScript'));
		console.log('  https://www.typescriptlang.org/tsconfig#checkJs');
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
