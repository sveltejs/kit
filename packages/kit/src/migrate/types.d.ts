export interface BranchHierarchy {
	path: string;
	files: string[];
	folders: BranchHierarchy[];
}
