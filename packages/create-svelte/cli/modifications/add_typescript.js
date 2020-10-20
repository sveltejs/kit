import fs from 'fs';
import path from 'path';
import { bold, cyan, green } from 'kleur/colors';

export default async function add_typescript(cwd, yes) {
	if (yes) {
		// update package.json
		const pkg_file = path.join(cwd, 'package.json');
		const pkg_json = fs.readFileSync(pkg_file, 'utf-8');
		const pkg = JSON.parse(pkg_json);

		pkg.devDependencies['typescript'] = '^4.0.0';

		fs.writeFileSync(pkg_file, JSON.stringify(pkg, null, '\t'));

		// update example component
		const file = path.join(cwd, 'src/components/Counter.svelte');
		const code = fs.readFileSync(file, 'utf-8');
		fs.writeFileSync(file, code.replace('<script>', '<script lang="ts">').replace('let count = 0', 'let count: number = 0'));

		console.log(bold(green(`✔ Added 'typescript' to package.json`)));
	} else {
		console.log(`You can add TypeScript support later with ${bold(cyan('npm install -D typescript'))}`);
	}
}