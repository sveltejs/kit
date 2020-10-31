import { mkdirp } from '@sveltejs/app-utils/files';
import fs from 'fs';
import parser from 'gitignore-parser';
import { bold, cyan, green, red } from 'kleur/colors';
import path from 'path';
import prompts from 'prompts/lib/index';
import glob from 'tiny-glob/sync';
import gitignore_contents from '../template/.gitignore';
import add_css from './modifications/add_css';
import add_typescript from './modifications/add_typescript';
import versions from './versions';

const disclaimer = `
█████████  ███████████    ███████    ███████████  ███
███░░░░░███░█░░░███░░░█  ███░░░░░███ ░░███░░░░░███░███
░███    ░░░ ░   ░███  ░  ███     ░░███ ░███    ░███░███
░░█████████     ░███    ░███      ░███ ░██████████ ░███
░░░░░░░░███    ░███    ░███      ░███ ░███░░░░░░  ░███
███    ░███    ░███    ░░███     ███  ░███        ░░░
░░█████████     █████    ░░░███████░   █████        ███
░░░░░░░░░     ░░░░░       ░░░░░░░    ░░░░░        ░░░

Pump the brakes! A little disclaimer...

svelte@next is not ready for use yet. It definitely can't
run your apps, and it might not run at all.

We haven't yet started accepting community contributions,
and we don't need people to start raising issues yet.

Given these warnings, please feel free to experiment, but
you're on your own for now. We'll have something to show
soon.
`;

async function main(): Promise<void> {
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

	files.forEach(file => {
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
		.replace(/"(.+)": "workspace:.+"/g, (_m, name) => `"${name}": "${versions[name]}"`);

	fs.writeFileSync(pkg_file, pkg_json);

	console.log(bold(green(`✔ Copied project files`)));

	await promptModifications(target);

	console.log(`\nNext steps:`);
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

async function promptModifications(target: string) {
	const tsResponse = await prompts({
		type: 'confirm',
		name: 'value',
		message: 'Use TypeScript in components?',
		initial: false
	});
	await add_typescript(target, tsResponse.value);

	const cssResponse = await prompts({
		type: 'select',
		name: 'value',
		message: 'What do you want to use for writing Styles in Svelte components?',
		choices: [
			{ title: 'CSS', value: 'css' },
			{ title: 'Less', value: 'less' },
			{ title: 'SCSS', value: 'scss' }
		]
	});
	await add_css(target, cssResponse.value);
}

main();
