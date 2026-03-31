import { read } from '$app/server';
import file from './file.txt?url';

export function GET() {
	return read(file);
}
