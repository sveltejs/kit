import type { ESLint, Linter, Rule } from 'eslint';

export const rules: Record<
	'no-google-fonts-cdn' | 'no-duplicate-font' | 'css-variable-prefix',
	Rule.RuleModule
>;

export const configs: {
	recommended: Linter.Config[];
};

declare const plugin: ESLint.Plugin & { configs: typeof configs };
export default plugin;
