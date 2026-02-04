export interface EnforcedConfig {
	[key: string]: EnforcedConfig | true;
}

export interface Env {
	public: Record<string, string>;
	private: Record<string, string>;
}
