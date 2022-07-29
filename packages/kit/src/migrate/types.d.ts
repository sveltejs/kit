export interface BranchHierarchy {
	/**
	 * The whole relative path to this dir
	 */
	path: string;
	/**
	 * Files in that dir
	 */
	files: Array<{ moved_down: boolean; name: string }>;
	/**
	 * Recurse
	 */
	folders: BranchHierarchy[];
}
