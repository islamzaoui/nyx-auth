import type { Adapter, DatabaseSession } from "@nyx-auth/core";
import { db } from ".";

interface SessionRow {
	id: string;
	user_id: string;
	secret_hash: Uint8Array;
	created_at: string;
	last_verified_at: string;
	ip_address: string;
}

function rowToSession(row: SessionRow): DatabaseSession<{ ipAddress: string }> {
	return {
		id: row.id,
		userId: row.user_id,
		secretHash: new Uint8Array(row.secret_hash),
		createdAt: new Date(row.created_at),
		lastVerifiedAt: new Date(row.last_verified_at),
		attributes: { ipAddress: row.ip_address },
	};
}

export class SqliteAdapter implements Adapter<{ ipAddress: string }> {
	async insertSession(session: DatabaseSession<{ ipAddress: string }>): Promise<undefined> {
		db.query(
			`INSERT INTO sessions (id, user_id, secret_hash, created_at, last_verified_at, ip_address)
			 VALUES (?, ?, ?, ?, ?, ?)`
		).run(
			session.id,
			session.userId,
			Buffer.from(session.secretHash),
			session.createdAt.toISOString(),
			session.lastVerifiedAt.toISOString(),
			session.attributes.ipAddress
		);
		return undefined;
	}

	async findSessionById(sessionId: string): Promise<DatabaseSession<{ ipAddress: string }> | null> {
		const row = db.query("SELECT * FROM sessions WHERE id = ?").get(sessionId) as SessionRow | null;
		if (!row) return null;
		return rowToSession(row);
	}

	async updateSessionbyId(sessionId: string, session: Partial<Omit<DatabaseSession<{ ipAddress: string }>, "id" | "userId">>): Promise<undefined> {
		const existingRow = db.query("SELECT * FROM sessions WHERE id = ?").get(sessionId) as SessionRow | null;
		if (!existingRow) return undefined;

		const merged = { ...rowToSession(existingRow), ...session };
		db.query(
			`UPDATE sessions
			 SET secret_hash = ?, created_at = ?, last_verified_at = ?, ip_address = ?
			 WHERE id = ?`
		).run(
			Buffer.from(merged.secretHash),
			merged.createdAt.toISOString(),
			merged.lastVerifiedAt.toISOString(),
			merged.attributes.ipAddress,
			sessionId
		);
		return undefined;
	}

	async deleteSessionById(sessionId: string): Promise<undefined> {
		db.query("DELETE FROM sessions WHERE id = ?").run(sessionId);
		return undefined;
	}

	async deleteSessionsByUserId(userId: string): Promise<undefined> {
		db.query("DELETE FROM sessions WHERE user_id = ?").run(userId);
		return undefined;
	}
}
