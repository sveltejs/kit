//eslint-disable-next-line import/no-unresolved
import { mkdirp } from '@sveltejs/kit/filesystem';
import fs from 'fs';
import parser from 'gitignore-parser';
import { bold, cyan, gray, green, red, underline } from 'kleur/colors';
import path from 'path';
import prompts from 'prompts/lib/index';
import glob from 'tiny-glob/sync.js';
import gitignore_contents from '../template/.gitignore';
import add_typescript from './modifications/add_typescript';
// import versions from './versions';
import { version } from '../package.json';
import add_prettier from './modifications/add_prettier';
import add_eslint from './modifications/add_eslint';

const disclaimer = `
Welcome to the SvelteKit setup wizard!

SvelteKit is in public beta now. There are definitely bugs and some feature might not work yet.
If you encounter an issue, have a look at https://github.com/sveltejs/kit/issues and open a new one, if it is not already tracked.
`;

async function main() {
	console.log(gray(`\ncreate-svelte version ${version}`));
	console.log(red(disclaimer));

	const target = process.argv[2] || '.';

	if (fs.existsSync(target)) {
		if (fs.readdirSync(target).length > 0) {
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
		mkdirp(target);
	}

	const cwd = path.join(__dirname, 'template');
	const gitignore = parser.compile(gitignore_contents);

	const files = glob('**/*', { cwd }).filter(gitignore.accepts);

	files.forEach((file) => {
		const src = path.join(cwd, file);
		const dest = path.join(target, file);

		if (fs.statSync(src).isDirectory()) {
			mkdirp(dest);
		} else {
			fs.copyFileSync(src, dest);
		}
	});

	fs.writeFileSync(path.join(target, '.gitignore'), gitignore_contents);

	const name = path.basename(path.resolve(target));

	const pkg_file = path.join(target, 'package.json');
	const pkg_json = fs
		.readFileSync(pkg_file, 'utf-8')
		.replace('~TODO~', name)
		.replace(/"(.+)": "workspace:.+"/g, (_m, name) => `"${name}": "next"`); // TODO ^${versions[name]}

	fs.writeFileSync(pkg_file, pkg_json);

	console.log(bold(green('✔ Copied project files')));

	await prompt_modifications(target);

    console.log(`\n✧ Want to add other parts to your code base or add support for ${bold(cyan('CSS preprocessors'))}?`);
	console.log(
        `\nVisit ${bold(cyan('https://github.com/svelte-add/svelte-adders'))} and unleash the possibilities with a community project of commands to add particular functionalities to Svelte projects.\n`
	);

	console.log('\nNext steps:');
	let i = 1;

	const relative = path.relative(process.cwd(), target);
	if (relative !== '') {
		console.log(`  ${i++}: ${bold(cyan(`cd ${relative}`))}`);
	}

	console.log(`  ${i++}: ${bold(cyan('npm install'))} (or pnpm install, or yarn)`);
	console.log(`  ${i++}: ${bold(cyan('npm run dev -- --open'))}`);

	console.log(`\nTo close the dev server, hit ${bold(cyan('Ctrl-C'))}`);
	console.log('\nStuck? Visit us at https://svelte.dev/chat\n');
}

/**
 * Go through the prompts to let the user setup his project.
 *
 * @param {string} target
 */
async function prompt_modifications(target) {
	const ts_response = await prompts({
		type: 'confirm',
		name: 'value',
		message: 'Use TypeScript in components?',
		initial: false
	});
	await add_typescript(target, ts_response.value);

	const eslint_response = await prompts({
		type: 'confirm',
		name: 'value',
		message: 'Add ESLint for code linting?',
		initial: false
	});
	await add_eslint(target, eslint_response.value, ts_response.value);

	const prettier_response = await prompts({
		type: 'confirm',
		name: 'value',
		message: 'Add Prettier for code formatting?',
		initial: false
	});
	await add_prettier(target, prettier_response.value, eslint_response.value);
}

main();
