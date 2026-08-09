import requirePathToFileURL from './require-path-to-file-url.js';

/** @type {import('eslint').ESLint.Plugin} */
export default {
	meta: {
		name: 'kit-node-custom'
	},
	rules: {
		'require-path-to-file-url': requirePathToFileURL
	}
};
