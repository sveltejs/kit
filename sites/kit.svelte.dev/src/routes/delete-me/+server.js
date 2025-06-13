import { read } from '$app/server';
import file from './file.txt?url';

export const config = {
	runtime: 'edge'
};

export const prerender = false;

export async function GET() {
	const text = await read(file).text();

	return new Response(`${text} at ${new Date()}`);
}
