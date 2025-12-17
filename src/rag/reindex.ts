import { indexPlayer, listPlayers } from "../routes/createPlayer"

export async function reindexAllPlayers(ownerId: string) {
	const players = await listPlayers(ownerId)

	for (const player of players) {
		await indexPlayer(player)
	}

	console.log(`✅ Reindexed ${players.length} players`)
}
