import users from './_user.json'
import {sign} from 'jsonwebtoken'
import {serialize} from 'cookie'
import {dev} from '$app/env'

export async function post({body,url}){
    const {username,password} = body
    // For example, I have created username and password's in ./_user.json
    //Here, I am validating username and password this api received,
    //In real life example you will call a db
    const user = users.find(el => el.username == username && el.password == password)
    if(!user){
        return {
            status:401,
            body: {
                error : 'Incorrect username or password!'
            }
        }
    }
    const jwt = sign({username:user.username}, import.meta.env.VITE_JWT_PRIVATE_KEY)// add a private key in .env

    const cookie = createCookie({name:'jwt',value:jwt,origin:url.origin})
    return {
        status : 200,
        headers  :{
            'set-cookie':cookie
        },
    }
}

function createCookie({name,value,origin}){
    let expires = new Date()
    expires.setMonth(expires.getMonth()+6) //setting cookie to expire in 6 months
    let cookie_options = {httpOnly:true, path:'/',sameSite:true,expires}
    if(!dev){
        cookie_options.secure = true
        cookie_options.domain = origin
    }
    const cookie = serialize(name,value,cookie_options)
    return cookie
  }