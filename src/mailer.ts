import nodemailer from "nodemailer"
import dotenv from "dotenv"
dotenv.config()

const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS

let transporter: nodemailer.Transporter | null = null

export function initMailer() {
	if (!SMTP_USER || !SMTP_PASS) {
		console.warn("⚠️ SMTP credentials missing. Email sending disabled.")
		return
	}

	transporter = nodemailer.createTransport({
		host: "smtp.gmail.com",
		port: 465,
		secure: true,
		auth: {
			user: SMTP_USER,
			pass: SMTP_PASS
		}
	})

	console.log("📧 Mailer initialized using Gmail App Password")
}

export async function sendMail(opts: { to: string; subject: string; html: string; text?: string }) {
	if (!transporter) {
		throw new Error("Mailer not initialized. Did you call initMailer() in index.ts?")
	}

	return transporter.sendMail({
		from: `"Thati Pradeep Reddy Industries" <${SMTP_USER}>`,
		to: opts.to,
		subject: opts.subject,
		text: opts.text,
		html: opts.html
	})
}
