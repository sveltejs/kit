import fs from 'fs';
import { bold, green } from 'kleur/colors';
import path from 'path';
import {
	add_snowpack_plugin_to_config,
	add_svelte_prepocess_to_config,
	update_component,
	update_package_json
} from './utils';

export default async function add_typescript(cwd, yes) {
	if (yes) {
		update_package_json(cwd, {
			typescript: '^4.0.0',
			tslib: '^2.0.0',
			'svelte-preprocess': '^4.0.0',
			'@snowpack/plugin-typescript': '^1.0.0'
		});
		update_component(cwd, 'src/components/Counter.svelte', [
			['<script>', '<script lang="ts">'],
			['let count = 0', 'let count: number = 0']
		]);
		add_svelte_prepocess_to_config(cwd);
		add_snowpack_plugin_to_config(cwd, '@snowpack/plugin-typescript');
		add_tsconfig(cwd);
		add_d_ts_file(cwd);

		console.log(
			bold(
				green(
					`✔ Added TypeScript support. ` +
						`To use it inside Svelte components, add lang="ts" to the attributes of a script tag.`
				)
			)
		);
	} else {
		console.log(`You can add TypeScript support later. We'll let you know soon how to do it.`);
	}
}

function add_tsconfig(cwd) {
	fs.writeFileSync(
		path.join(cwd, 'tsconfig.json'),
		`{
	"compilerOptions": {
		"moduleResolution": "node",
		"target": "es2017",
		/** 
			 Svelte Preprocess cannot figure out whether you have a value or a type, so tell TypeScript
			to enforce using \`import type\` instead of \`import\` for Types.
			*/
		"importsNotUsedAsValues": "error",
		"isolatedModules": true,
		/**
			 To have warnings/errors of the Svelte compiler at the correct position,
			enable source maps by default.
			*/
		"sourceMap": true,		
		"esModuleInterop": true,
		"skipLibCheck": true,
		"forceConsistentCasingInFileNames": true
	},
	"include": ["src/**/*"],
	"exclude": ["node_modules/*", ".svelte"]
}`
	);
}

function add_d_ts_file(cwd) {
	fs.writeFileSync(
		path.join(cwd, 'src', 'globals.d.ts'),
		`//#region Ensure Svelte file endings have a type for TypeScript
/**
 * These declarations tell TypeScript that we allow import of Svelte files in TS files, e.g.
 * \`\`\`
		import Component from './Component.svelte';
	 \`\`\`
 */
declare module '*.svelte' {
	export { SvelteComponent as default } from 'svelte';
}
//#endregion

//#region Ensure image file endings have a type for TypeScript
/**
 * These declarations tell TypeScript that we allow import of images, e.g.
 * \`\`\`
		<script lang='ts'>
			import successkid from 'images/successkid.jpg';
		</script>
		<img src="{successkid}">
	 \`\`\`
 */
declare module "*.gif" {
	const value: string;
	export = value;
}

declare module "*.jpg" {
	const value: string;
	export = value;
}

declare module "*.jpeg" {
	const value: string;
	export = value;
}

declare module "*.png" {
	const value: string;
	export = value;
}

declare module "*.svg" {
	const value: string;
	export = value;
}

declare module "*.webp" {
	const value: string;
	export = value;
}
//#endregion
`
	);
}
