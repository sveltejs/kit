declare global {
	interface Window {
		before_navigate_calls: Array<string | null>;
		invalidated: boolean;
		oops: string;
		pageContext: any;
		mounted: number;
		fulfil_navigation: (value: any) => void;
		promise: Promise<any>;
		PUBLIC_DYNAMIC: string;
	}
}

export {};
