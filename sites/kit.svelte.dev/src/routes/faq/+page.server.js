import { read_all } from '$lib/docs/server';

export async function GET() {
	return {
		sections: await read_all('faq')
	};
}
