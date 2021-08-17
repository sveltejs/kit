export type ConfigDefinition =
	| {
			type: 'leaf';
			default: any;
			validate(value: any, keypath: string): any;
	  }
	| {
			type: 'branch';
			children: Record<string, ConfigDefinition>;
	  };
