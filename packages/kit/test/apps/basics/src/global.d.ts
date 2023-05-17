declare global {
	interface Window {
		invalidated: boolean;
		oops: string;
		pageContext: any;
		mounted: number;
		fulfil_navigation: (value: any) => void;
		promise: Promise<any>;
		update_state: number;
		PUBLIC_DYNAMIC: string;
	}
}

export {};
