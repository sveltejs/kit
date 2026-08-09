import noRuntimeToExportsImports from './no-runtime-to-exports-imports.js';

/** @type {import('eslint').ESLint.Plugin} */
export default {
	meta: {
		name: 'kit-custom'
	},
	rules: {
		'no-runtime-to-exports-imports': noRuntimeToExportsImports
	}
};
