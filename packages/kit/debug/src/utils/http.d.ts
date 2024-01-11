/**
 * Given an Accept header and a list of possible content types, pick
 * the most suitable one to respond with
 * @param {string} accept
 * @param {string[]} types
 */
export function negotiate(accept: string, types: string[]): string | undefined;
/**
 * @param {Request} request
 */
export function is_form_content_type(request: Request): boolean;
//# sourceMappingURL=http.d.ts.map