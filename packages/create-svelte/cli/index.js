import fs from 'fs';
import path from 'path';
import { bold, cyan, green } from 'kleur/colors';
import parser from 'gitignore-parser';
import gitignore_contents from '../template/.gitignore';
import prompts from 'prompts/lib/index';
import glob from 'tiny-glob/sync';

const mkdirp = (dir, opts) => {
	try {
		fs.mkdirSync(dir, opts);
	} catch (e) {
		if (e.code === 'EEXIST') return;
		throw e;
	}
};

async function main() {
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
		mkdirp(target, { recursive: true });
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

	console.log(bold(green(`✔ Copied project files`)));
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

main();