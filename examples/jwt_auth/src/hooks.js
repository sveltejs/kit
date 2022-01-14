import {parse} from 'cookie';
import {verify} from 'jsonwebtoken'


export async function handle({ request, resolve }) {
	const cookies = parse(request.headers.cookie || '');
    //verify your jwt here, pass data to session object using locals
    try{
		request.locals.user = cookies.jwt && verify(cookies.jwt, import.meta.env.VITE_JWT_PRIVATE_KEY);		
	}catch(err){
		request.locals.user=undefined
	}
    const response = await resolve(request)
	return response;
}

export function getSession({ locals }) {
	return {
		user: locals.user && {
			...locals.user
		}
	};
}
