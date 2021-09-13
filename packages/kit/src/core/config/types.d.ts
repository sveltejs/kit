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

export type Validator<T = any> = (input: T, keypath: string) => T;
