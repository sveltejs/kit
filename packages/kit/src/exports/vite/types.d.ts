export interface EnforcedConfig {
	[key: string]: EnforcedConfig | true;
}

export interface IndexableConfig {
	[key: string]: IndexableConfig | undefined
}
