import { read } from '$app/server';
import goose from '../../../../goose.jpg';

export function GET() {
	return read(goose);
}
