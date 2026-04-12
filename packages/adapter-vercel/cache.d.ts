export interface RemoteQueryCacheMetadata {
	maxAge: number;
	tags: string[];
	staleWhileRevalidate?: number;
}

export function get(queryId: string): Promise<string | undefined>;
export function set(
	queryId: string,
	stringifiedResponse: string,
	cache: RemoteQueryCacheMetadata
): Promise<void>;
export function setHeaders(headers: Headers, cache: RemoteQueryCacheMetadata): Promise<void>;
export function invalidate(tags: string[]): Promise<void>;
