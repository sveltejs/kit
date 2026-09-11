const stub = '__SVELTEKIT_ADAPTER_NODE_MIMETYPES__';

export function GET() {
	return new Response(stub);
}
