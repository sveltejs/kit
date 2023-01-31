import type { CompileOptions } from 'svelte/types/compiler/interfaces'; // TODO bump Svelte version, then export from right path

export interface PackageConfig {
	/**
	 * Path to the files that should be packaged.
	 * If this is used inside SvelteKit, this is read from `kit.files.lib` if unset. Defaults to `src/lib` otherwise.
	 */
	source?: string;
	/**
	 * Output directory
	 */
	dir?: string;
	/**
	 * Whether to emit type definition files. Defaults to `true`.
	 */
	emitTypes?: boolean;
	/**
	 * Function that determines if the given filepath will be included in the `exports` field
	 * of the `package.json`.
	 * @deprecated use `packageJson` instead
	 */
	exports?(filepath: string): boolean;
	/**
	 * Function that determines if the given file is part of the output.
	 */
	files?(filepath: string): boolean;
	/**
	 * Is passed the original `package.json` and the generated one, and should return the final `package.json`.
	 * If `undefined` is returned, no `package.json` will be written to the output directory.
	 */
	packageJson?(
		original: Record<string, any>,
		generated: Record<string, any>
	): Record<string, any> | undefined;
}

export interface Config {
	compilerOptions?: CompileOptions;
	extensions?: string[];
	kit?: any;
	package?: PackageConfig;
	preprocess?: any;
}
