/**
 * @param {{
 *   request: import('http').IncomingMessage;
 *   base: string;
 *   bodySizeLimit?: number;
 * }} options
 * @returns {Promise<Request>}
 */
export function getRequest({ request, base, bodySizeLimit }: {
    request: import('http').IncomingMessage;
    base: string;
    bodySizeLimit?: number;
}): Promise<Request>;
/**
 * @param {import('http').ServerResponse} res
 * @param {Response} response
 * @returns {Promise<void>}
 */
export function setResponse(res: import('http').ServerResponse, response: Response): Promise<void>;
//# sourceMappingURL=index.d.ts.map