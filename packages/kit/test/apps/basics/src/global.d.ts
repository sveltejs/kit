declare global {
	interface Window {
		invalidated: boolean;
		oops: string;
		pageContext: any;
		mounted: number;
		fulfil_navigation: (value: any) => void;
		handle_error_calls: Array<{ status: number; message: string }>;
		promise: Promise<any>;
		PUBLIC_DYNAMIC: string;
	}
}

export {};
