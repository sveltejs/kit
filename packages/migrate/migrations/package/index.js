import fs from 'node:fs';
import colors from 'kleur';
import path from 'node:path';
import prompts from 'prompts';
import { pathToFileURL } from 'node:url';
import { bail, check_git } from '../../utils.js';
import { migrate_config } from './migrate_config.js';
import { migrate_pkg } from './migrate_pkg.js';

export async function migrate() {
	if (!fs.existsSync('svelte.config.js')) {
		bail('Please re-run this script in a directory with a svelte.config.js');
	}
	if (!fs.existsSync('package.json')) {
		bail('Please re-run this script in a directory with a package.json');
	}

	console.log(
		colors
			.bold()
			.yellow(
				'\nThis will update your svelte.config.js and package.json in the current directory\n'
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

	const { default: config } = await import(pathToFileURL(path.resolve('svelte.config.js')).href);
	const has_package_config = !!config.package;

	config.package = {
		source: path.resolve(config.kit?.files?.lib ?? config.package?.source ?? 'src/lib'),
		dir: config.package?.dir ?? 'package',
		exports:
			config.package?.exports ??
			((/** @type {string} */ filepath) => !/^_|\/_|\.d\.ts$/.test(filepath)),
		files: config.package?.files ?? (() => true),
		emitTypes: config.package?.emitTypes ?? true
	};
	config.extensions = config.extensions ?? ['.svelte'];

	migrate_pkg(config);

	if (has_package_config) {
		migrate_config();
	}

	console.log(colors.bold().green('✔ Your project has been migrated'));

	console.log('\nRecommended next steps:\n');

	const cyan = colors.bold().cyan;

	const tasks = [
		use_git && cyan('git commit -m "migration to @sveltejs/package v2"'),
		'Review the migration guide at https://github.com/sveltejs/kit/pull/8922',
		'Read the updated docs at https://kit.svelte.dev/docs/packaging'
	].filter(Boolean);

	tasks.forEach((task, i) => {
		console.log(`  ${i + 1}: ${task}`);
	});

	console.log('');

	if (use_git) {
		console.log(`Run ${cyan('git diff')} to review changes.\n`);
	}
}
