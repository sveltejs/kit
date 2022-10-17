export interface ImportGraph {
	readonly id: string;
	readonly dynamic: boolean;
	readonly children: Generator<ImportGraph>;
}

export interface IllegalModuleGuardOptions {
	readonly allow_server_import_from_client?: (filepath: string) => boolean;
}
