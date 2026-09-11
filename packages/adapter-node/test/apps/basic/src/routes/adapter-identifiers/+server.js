// @ts-expect-error resolved by the Vite plugin in the test fixture
import { value as SERVER } from 'SERVER';

const BASE_PATH = 'user-base-path';
const APP_PATH = 'user-app-path';
const ENV_PREFIX = 'user-env-prefix';
const PRECOMPRESS = 'user-precompress';

export function GET() {
	return Response.json({ BASE_PATH, APP_PATH, ENV_PREFIX, PRECOMPRESS, SERVER });
}
