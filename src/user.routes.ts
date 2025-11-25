import { Router } from "express"
import { requireAuth, requireAdmin } from "./middleware/auth.middleware"
import { listUsers, findUserById, updateUser, deleteUser } from "./auth/auth.service"

const router = Router()

router.get("/", requireAuth, requireAdmin, (req, res) => {
	const limit = Math.min(100, Number(req.query.limit || 50))
	const offset = Number(req.query.offset || 0)
	const rows = listUsers(limit, offset)
	res.json({ data: rows, meta: { limit, offset } })
})

router.get("/me", requireAuth, (req: any, res) => {
	const id = req.user.id
	const user = findUserById(id)
	if (!user) return res.status(404).json({ error: "not found" })
	const { password_hash, ...safe } = user
	res.json({ data: safe })
})

router.get("/:id", requireAuth, (req: any, res) => {
	const id = Number(req.params.id)
	const user = findUserById(id)
	if (!user) return res.status(404).json({ error: "not found" })
	if (req.user.role !== "admin" && req.user.id !== id) return res.status(403).json({ error: "forbidden" })
	const { password_hash, ...safe } = user
	res.json({ data: safe })
})

router.patch("/:id", requireAuth, (req: any, res) => {
	const id = Number(req.params.id)
	if (req.user.role !== "admin" && req.user.id !== id) return res.status(403).json({ error: "forbidden" })
	const patch = req.body

	delete patch.password_hash
	const updated = updateUser(id, patch)
	if (!updated) return res.status(400).json({ error: "nothing to update" })
	const { password_hash, ...safe } = updated
	res.json({ data: safe })
})

router.delete("/:id", requireAuth, requireAdmin, (req, res) => {
	const id = Number(req.params.id)
	deleteUser(id)
	res.json({ ok: true })
})

export default router
