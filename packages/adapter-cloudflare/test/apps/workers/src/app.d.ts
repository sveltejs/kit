declare global {
	namespace App {
		interface Platform {
			env: Cloudflare.Env;
			ctx: Cloudflare.ExecutionContext;
		}
	}
}

export {};
