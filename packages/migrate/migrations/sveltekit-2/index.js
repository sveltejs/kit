import colors from 'kleur';
import fs from 'node:fs';
import prompts from 'prompts';
import semver from 'semver';
import glob from 'tiny-glob/sync.js';
import {
	bail,
	check_git,
	update_js_file,
	update_svelte_file,
	update_tsconfig
} from '../../utils.js';
import { migrate as migrate_svelte_4 } from '../svelte-4/index.js';
import {
	transform_code,
	update_pkg_json,
	update_svelte_config,
	update_tsconfig_content
} from './migrate.js';

export async function migrate() {
	if (!fs.existsSync('package.json')) {
		bail('Please re-run this script in a directory with a package.json');
	}

	if (!fs.existsSync('svelte.config.js')) {
		bail('Please re-run this script in a directory with a svelte.config.js');
	}

	console.log(
		colors
			.bold()
			.yellow(
				'\nThis will update files in the current directory\n' +
					"If you're inside a monorepo, run this in individual project directories rather than the workspace root.\n"
			)
	);

	const use_git = check_git();

	const response = await prompts({
		type: 'confirm',
		name: 'value',
		message: 'Continue?',
		initial: false
	});

	if (!response.value) {
		process.exit(1);
	}

	const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
	const svelte_dep = pkg.devDependencies?.svelte ?? pkg.dependencies?.svelte;
	if (svelte_dep === undefined) {
		bail('Please install Svelte before continuing');
	}

	if (semver.validRange(svelte_dep) && semver.gtr('4.0.0', svelte_dep)) {
		console.log(
			colors
				.bold()
				.yellow(
					'\nSvelteKit 2 requires Svelte 4 or newer. We recommend running the `svelte-4` migration first (`npx svelte-migrate svelte-4`).\n'
				)
		);
		const response = await prompts({
			type: 'confirm',
			name: 'value',
			message: 'Run `svelte-4` migration now?',
			initial: false
		});
		if (!response.value) {
			process.exit(1);
		} else {
			await migrate_svelte_4();
			console.log(
				colors
					.bold()
					.green('`svelte-4` migration complete. Continue with `sveltekit-2` migration?\n')
			);
			const response = await prompts({
				type: 'confirm',
				name: 'value',
				message: 'Continue?',
				initial: false
			});
			if (!response.value) {
				process.exit(1);
			}
		}
	}

	const folders = await prompts({
		type: 'multiselect',
		name: 'value',
		message: 'Which folders should be migrated?',
		choices: fs
			.readdirSync('.')
			.filter(
				(dir) =>
					fs.statSync(dir).isDirectory() &&
					dir !== 'node_modules' &&
					dir !== 'dist' &&
					!dir.startsWith('.')
			)
			.map((dir) => ({ title: dir, value: dir, selected: dir === 'src' }))
	});

	if (!folders.value?.length) {
		process.exit(1);
	}

	update_pkg_json();
	update_tsconfig(update_tsconfig_content);
	update_svelte_config();

	// const { default: config } = fs.existsSync('svelte.config.js')
	// 	? await import(pathToFileURL(path.resolve('svelte.config.js')).href)
	// 	: { default: {} };

	/** @type {string[]} */
	const svelte_extensions = /* config.extensions ?? - disabled because it would break .svx */ [
		'.svelte'
	];
	const extensions = [...svelte_extensions, '.ts', '.js'];
	// For some reason {folders.value.join(',')} as part of the glob doesn't work and returns less files
	const files = folders.value.flatMap(
		/** @param {string} folder */ (folder) =>
			glob(`${folder}/**`, { filesOnly: true, dot: true })
				.map((file) => file.replace(/\\/g, '/'))
				.filter((file) => !file.includes('/node_modules/'))
	);

	for (const file of files) {
		if (extensions.some((ext) => file.endsWith(ext))) {
			if (svelte_extensions.some((ext) => file.endsWith(ext))) {
				update_svelte_file(file, transform_code, (code) => code);
			} else {
				update_js_file(file, transform_code);
			}
		}
	}

	console.log(colors.bold().green('✔ Your project has been migrated'));

	console.log('\nRecommended next steps:\n');

	const cyan = colors.bold().cyan;

	const tasks = [
		'Run npm install (or the corresponding installation command of your package manager)',
		use_git && cyan('git commit -m "migration to SvelteKit 2"'),
		'Review the migration guide at https://kit.svelte.dev/docs/migrating-to-sveltekit-2',
		'Read the updated docs at https://kit.svelte.dev/docs'
	].filter(Boolean);

	tasks.forEach((task, i) => {
		console.log(`  ${i + 1}: ${task}`);
	});

	console.log('');

	if (use_git) {
		console.log(`Run ${cyan('git diff')} to review changes.\n`);
	}
}
