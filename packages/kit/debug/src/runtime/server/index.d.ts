export class Server {
    /** @param {import('@sveltejs/kit').SSRManifest} manifest */
    constructor(manifest: import('@sveltejs/kit').SSRManifest);
    /**
     * @param {{
     *   env: Record<string, string>
     * }} opts
     */
    init({ env }: {
        env: Record<string, string>;
    }): Promise<void>;
    /**
     * @param {Request} request
     * @param {import('../../types/internal.d.ts').RequestOptions} options
     */
    respond(request: Request, options: import('../../types/internal.d.ts').RequestOptions): Promise<Response>;
    #private;
}
//# sourceMappingURL=index.d.ts.map