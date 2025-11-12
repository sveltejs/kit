class CustomError extends Error {
	constructor(message, errorOpts) {
		super(message, errorOpts);
		this.status = 422;
	}
}

export function GET() {
	throw new CustomError('Custom error');
}
