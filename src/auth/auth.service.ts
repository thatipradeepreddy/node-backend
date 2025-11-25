import bcrypt from "bcryptjs"
import { db } from "../db"
import { randomToken } from "../utils/tokens"
import { User } from "./auth.types"

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12)

export function createUser(email: string, password: string, name?: string) {
	const password_hash = bcrypt.hashSync(password, BCRYPT_ROUNDS)
	const verification_token = randomToken(24)
	const stmt = db.prepare(`INSERT INTO users (email, password_hash, name, verification_token) VALUES (?, ?, ?, ?)`)
	const info = stmt.run(email.toLowerCase(), password_hash, name || null, verification_token)
	return { id: Number(info.lastInsertRowid), verification_token }
}

export function findUserByEmail(email: string): User | undefined {
	const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase())
	return (row as User) ?? undefined
}

export function findUserById(id: number): User | undefined {
	const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id)
	return (row as User) ?? undefined
}

export function verifyUserToken(id: number, token: string): boolean {
	const row = findUserById(id)
	if (!row) return false
	if (!row.verification_token) return false
	if (row.verification_token !== token) return false
	db.prepare("UPDATE users SET verified = 1, verification_token = NULL WHERE id = ?").run(id)
	return true
}

export function validatePassword(user: User | undefined, password: string): boolean {
	if (!user) return false
	return bcrypt.compareSync(password, user.password_hash)
}

export function incrementFailedLogin(id: number): void {
	const user = findUserById(id)
	const failed = (user?.failed_logins || 0) + 1
	let locked_until = user?.locked_until || 0
	if (failed >= 5) {
		locked_until = Date.now() + 15 * 60 * 1000
	}
	db.prepare("UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?").run(failed, locked_until, id)
}

export function resetFailedLogin(id: number): void {
	db.prepare("UPDATE users SET failed_logins = 0, locked_until = 0 WHERE id = ?").run(id)
}

export function setResetToken(id: number) {
	const token = randomToken(24)
	const expiry = Date.now() + 60 * 60 * 1000
	db.prepare("UPDATE users SET reset_token = ?, reset_expiry = ? WHERE id = ?").run(token, expiry, id)
	return { token, expiry }
}

export function useResetToken(id: number, token: string, newPassword: string): boolean {
	const user = findUserById(id)
	if (!user) return false
	if (!user.reset_token || !user.reset_expiry) return false
	if (user.reset_token !== token) return false
	if ((user.reset_expiry || 0) < Date.now()) return false
	const password_hash = bcrypt.hashSync(newPassword, BCRYPT_ROUNDS)
	db.prepare("UPDATE users SET password_hash = ?, reset_token = NULL, reset_expiry = NULL WHERE id = ?").run(password_hash, id)
	return true
}

export function listUsers(limit = 100, offset = 0) {
	return db
		.prepare("SELECT id, email, name, role, verified, created_at FROM users ORDER BY id LIMIT ? OFFSET ?")
		.all(limit, offset) as Array<Pick<User, "id" | "email" | "name" | "role" | "verified" | "created_at">>
}

export function updateUser(id: number, patch: { name?: string | null; role?: string | null; email?: string | null }) {
	const set: string[] = []
	const vals: any[] = []

	if (patch.name !== undefined) {
		set.push("name = ?")
		vals.push(patch.name)
	}

	if (patch.role !== undefined) {
		set.push("role = ?")
		vals.push(patch.role)
	}

	if (patch.email !== undefined) {
		const normalized = patch.email?.toLowerCase() ?? null
		set.push("email = ?")
		vals.push(normalized)
	}

	if (set.length === 0) return null
	vals.push(id)
	const sql = `UPDATE users SET ${set.join(", ")} WHERE id = ?`
	db.prepare(sql).run(...vals)
	return findUserById(id)
}

export function deleteUser(id: number) {
	db.prepare("DELETE FROM users WHERE id = ?").run(id)
	return true
}
