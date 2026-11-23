import { read } from '$app/server';
import file from './file.txt';

export function GET() {
	return read(file);
}
