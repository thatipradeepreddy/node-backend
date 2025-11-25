import { Request, Response, NextFunction } from "express"
import { verifyJwt } from "../utils/tokens"
import { findUserById } from "../auth/auth.service"

export function requireAuth(req: Request & { user?: any }, res: Response, next: NextFunction) {
	const authHeader = String(req.headers.authorization || "")
	const cookieToken = req.cookies?.token
	const token = (authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null) || cookieToken
	if (!token) return res.status(401).json({ error: "unauthenticated" })
	const payload = verifyJwt(token as string) as any
	if (!payload || !payload.sub) return res.status(401).json({ error: "invalid token" })
	const user = findUserById(Number(payload.sub))
	if (!user) return res.status(401).json({ error: "user not found" })
	req.user = { id: user.id, email: user.email, role: user.role }
	next()
}

export function requireAdmin(req: Request & { user?: any }, res: Response, next: NextFunction) {
	if (!req.user) return res.status(401).json({ error: "unauthenticated" })
	if (req.user.role !== "admin") return res.status(403).json({ error: "forbidden" })
	next()
}
