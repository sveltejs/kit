import { redirect } from '@sveltejs/kit'

export const actions = {
    default: ({ url}) => {
       redirect(307, "/resolveDestination/redirect-in-action/from")
    }
}