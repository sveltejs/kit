import {serialize} from 'cookie'
export async function get(){
    return {
        headers: {
			'set-cookie': serialize('jwt','deleted',{expires:new Date(0),path:'/',domain:import.meta.env.VITE_DOMAIN}),
            location:'/auth/login'
        },
        status:302
    }
}