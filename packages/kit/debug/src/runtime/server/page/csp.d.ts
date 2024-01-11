export class Csp {
    /**
     * @param {import('./types.js').CspConfig} config
     * @param {import('./types.js').CspOpts} opts
     */
    constructor({ mode, directives, reportOnly }: import('./types.js').CspConfig, { prerender }: import('./types.js').CspOpts);
    /** @readonly */
    readonly nonce: string;
    /** @type {CspProvider} */
    csp_provider: CspProvider;
    /** @type {CspReportOnlyProvider} */
    report_only_provider: CspReportOnlyProvider;
    get script_needs_nonce(): boolean;
    get style_needs_nonce(): boolean;
    /** @param {string} content */
    add_script(content: string): void;
    /** @param {string} content */
    add_style(content: string): void;
}
declare class CspProvider extends BaseProvider {
    get_meta(): string | undefined;
}
declare class CspReportOnlyProvider extends BaseProvider {
}
declare class BaseProvider {
    /**
     * @param {boolean} use_hashes
     * @param {import('../../../types/internal.d.ts').CspDirectives} directives
     * @param {string} nonce
     */
    constructor(use_hashes: boolean, directives: import('../../../types/internal.d.ts').CspDirectives, nonce: string);
    script_needs_nonce: boolean;
    style_needs_nonce: boolean;
    /** @param {string} content */
    add_script(content: string): void;
    /** @param {string} content */
    add_style(content: string): void;
    /**
     * @param {boolean} [is_meta]
     */
    get_header(is_meta?: boolean | undefined): string;
    #private;
}
export {};
//# sourceMappingURL=csp.d.ts.map