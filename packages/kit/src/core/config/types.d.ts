export type ConfigDefinition =
	| {
			type: 'leaf';
			fallback: any;
			validate(value: any, keypath: string): any;
	  }
	| {
			type: 'branch';
			children: Record<string, ConfigDefinition>;
	  };
