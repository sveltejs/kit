import nodemailer from 'nodemailer'
import { MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD } from '$env/static/private'

let emailClient: nodemailer.Transporter

if (process.env.NODE_ENV === 'production') {
	emailClient = nodemailer.createTransport({
		host: MAIL_HOST,
		port: MAIL_PORT,
		secure: false,
		auth: {
			user: MAIL_USERNAME,
			pass: MAIL_PASSWORD
		}
	})
} else {
	if (!global.emailClient) {
		global.emailClient = nodemailer.createTransport({
			host: MAIL_HOST,
			port: MAIL_PORT,
			secure: false,
			auth: {
				user: MAIL_USERNAME,
				pass: MAIL_PASSWORD
			}
		})
	}
	emailClient = global.emailClient
}

export { emailClient }
