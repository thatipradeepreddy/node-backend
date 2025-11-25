import { Request, Response, Router } from "express"
import {
	createUser,
	findUserByEmail,
	validatePassword,
	verifyUserToken,
	incrementFailedLogin,
	resetFailedLogin,
	setResetToken,
	useResetToken,
	listUsers,
	findUserById,
	updateUser,
	deleteUser
} from "./auth.service"
import { createJwt } from "../utils/tokens"
import { sendMail, initMailer } from "../mailer"
import dotenv from "dotenv"
dotenv.config()

initMailer()

const router = Router()

router.post("/register", async (req: Request, res: Response) => {
	try {
		const { email, password, name } = req.body
		if (!email || !password) return res.status(400).json({ error: "email and password required" })
		if (findUserByEmail(email)) return res.status(409).json({ error: "email already registered" })
		const { id, verification_token } = createUser(email, password, name)

		const verifyLink = `${process.env.APP_BASE_URL || "http://localhost:3000"}/auth/verify?token=${verification_token}&id=${id}`
		if (process.env.SMTP_USER) {
			sendMail({
				to: email,
				subject: "Verify your account",
				html: `Click <a href="${verifyLink}">here</a> to verify.`
			}).catch(console.error)
		} else {
			console.info("Verification link (dev):", verifyLink)
		}
		return res.status(201).json({ ok: true, id })
	} catch (err) {
		console.error(err)
		return res.status(500).json({ error: "server error" })
	}
})

router.get("/verify", (req: Request, res: Response) => {
	const token = String(req.query.token || "")
	const id = Number(req.query.id || 0)
	if (!token || !id) return res.status(400).send("Invalid request")
	const ok = verifyUserToken(id, token)
	if (!ok) return res.status(400).send("Invalid token or user")
	return res.send("Email verified. You can login.")
})

router.post("/login", (req: Request, res: Response) => {
	const { email, password } = req.body
	if (!email || !password) return res.status(400).json({ error: "email + password required" })
	const user = findUserByEmail(email)
	if (!user) return res.status(401).json({ error: "invalid credentials" })

	if (user.locked_until && user.locked_until > Date.now()) {
		return res.status(403).json({ error: "account locked. try later" })
	}

	const ok = validatePassword(user, password)
	if (!ok) {
		incrementFailedLogin(user.id)
		return res.status(401).json({ error: "invalid credentials" })
	}
	if (!user.verified) return res.status(403).json({ error: "email not verified" })

	resetFailedLogin(user.id)

	const token = createJwt({ sub: user.id, role: user.role, email: user.email })

	res.cookie("token", token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: 1000 * 60 * 60
	})

	return res.json({ ok: true, token })
})

router.post("/forgot", (req: Request, res: Response) => {
	const { email } = req.body
	if (!email) return res.status(400).json({ error: "email required" })
	const user = findUserByEmail(email)
	if (!user) return res.json({ ok: true })
	const { token } = setResetToken(user.id)
	const resetLink = `${process.env.APP_BASE_URL || "http://localhost:3000"}/auth/reset?token=${token}&id=${user.id}`
	if (process.env.SMTP_USER) {
		sendMail({ to: email, subject: "Reset your password", html: `Reset: <a href="${resetLink}">${resetLink}</a>` }).catch(
			console.error
		)
	} else {
		console.info("Reset link (dev):", resetLink)
	}
	return res.json({ ok: true })
})

router.post("/reset", (req: Request, res: Response) => {
	const { id, token, newPassword } = req.body
	if (!id || !token || !newPassword) return res.status(400).json({ error: "missing fields" })
	const ok = useResetToken(Number(id), token, newPassword)
	if (!ok) return res.status(400).json({ error: "invalid or expired token" })
	return res.json({ ok: true })
})

export default router
