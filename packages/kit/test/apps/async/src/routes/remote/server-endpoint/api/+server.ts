import { json } from '@sveltejs/kit';
import { add, get } from '../internal.remote';

export async function GET() {
	const result = await get();
	return json({ result });
}

export async function POST() {
	const result = await add(1);
	return json({ result });
}
