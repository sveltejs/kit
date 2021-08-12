/* eslint-disable @typescript-eslint/no-unused-vars */
import { RequestHandler } from './endpoint';

const toJSONHandler: RequestHandler = () => ({
	body: {
		number: 10,
		date: new Date(),
		custom: {
			toJSON() {
				return 'I have a custom JSON serialization!';
			}
		}
	}
});

const directToJSONHandler: RequestHandler = () => ({
	body: new Date()
});

const nestedToJSONHandler: RequestHandler = () => ({
	body: [new Date()]
});
