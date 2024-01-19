import { read } from '$app/server';
import file from './file.txt?url';

export const config = {
	runtime: 'edge'
};

export const prerender = false;

export function GET() {
	return read(file);
}
