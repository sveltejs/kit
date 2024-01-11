/**
 * @param {string} file
 * @param {string} code
 */
export function write_if_changed(file: string, code: string): void;
/**
 * @param {string} file
 * @param {string} code
 */
export function write(file: string, code: string): void;
/**
 * Allows indenting template strings without the extra indentation ending up in the result.
 * Still allows indentation of lines relative to one another in the template string.
 * @param {TemplateStringsArray} strings
 * @param {any[]} values
 */
export function dedent(strings: TemplateStringsArray, ...values: any[]): string;
export function isSvelte5Plus(): boolean;
//# sourceMappingURL=utils.d.ts.map