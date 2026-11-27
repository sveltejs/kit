import { read } from '$app/server';
import file from '#file';

export function GET() {
	return read(file);
}
