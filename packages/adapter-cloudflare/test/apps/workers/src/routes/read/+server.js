import { read } from '$app/server';
import file from './file.txt?url';

export async function GET() {
	const asset = read(file);
	const text = await asset.text();
	return new Response(text, asset);
}
