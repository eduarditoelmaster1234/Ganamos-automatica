import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const MIGRATIONS = `
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL UNIQUE,
  panel_user_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active')),
  creation_sent INTEGER NOT NULL DEFAULT 0,
  attribution TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_players_panel_user_id ON players (panel_user_id);

CREATE TABLE IF NOT EXISTS balance_cache (
  player_id TEXT PRIMARY KEY REFERENCES players (id) ON DELETE CASCADE,
  balance REAL NOT NULL,
  currency TEXT NOT NULL,
  confirmed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  player_id TEXT REFERENCES players (id) ON DELETE SET NULL,
  client_id TEXT,
  topic TEXT,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_player ON chat_messages (player_id, created_at);

CREATE TABLE IF NOT EXISTS chat_receipts (
  id TEXT PRIMARY KEY,
  player_id TEXT REFERENCES players (id) ON DELETE SET NULL,
  client_id TEXT,
  file_name TEXT,
  mime_type TEXT,
  size_bytes INTEGER,
  stored_path TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_receipts_player ON chat_receipts (player_id, created_at);
`

function normalizeRow(row) {
  return row ? { ...row } : null
}

export function createDatabase({ file }) {
  if (file !== ':memory:') {
    fs.mkdirSync(path.dirname(file), { recursive: true })
  }

  const db = new DatabaseSync(file)
  db.exec('PRAGMA foreign_keys = ON;')
  db.exec('PRAGMA busy_timeout = 5000;')
  if (file !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;')
    db.exec('PRAGMA synchronous = NORMAL;')
  }
  db.exec(MIGRATIONS)

  // Compatibilidad con bases creadas antes de existir creation_sent.
  const playerColumns = db.prepare('PRAGMA table_info(players)').all()
  if (!playerColumns.some((column) => column.name === 'creation_sent')) {
    db.exec('ALTER TABLE players ADD COLUMN creation_sent INTEGER NOT NULL DEFAULT 0;')
  }

  const statements = {
    playerByClientId: db.prepare('SELECT * FROM players WHERE client_id = ?'),
    playerById: db.prepare('SELECT * FROM players WHERE id = ?'),
    playerByToken: db.prepare('SELECT * FROM players WHERE access_token = ?'),
    playerByUsername: db.prepare('SELECT * FROM players WHERE username = ?'),
    insertPlayer: db.prepare(`
      INSERT INTO players
        (id, client_id, name, username, access_token, panel_user_id, status, attribution, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, NULL, 'pending', ?, ?, ?)
    `),
    updateUsername: db.prepare(
      'UPDATE players SET username = ?, updated_at = ? WHERE id = ?',
    ),
    markCreationSent: db.prepare(
      'UPDATE players SET creation_sent = 1, updated_at = ? WHERE id = ?',
    ),
    resetCreationSent: db.prepare(
      'UPDATE players SET creation_sent = 0, updated_at = ? WHERE id = ?',
    ),
    activatePlayer: db.prepare(`
      UPDATE players
         SET panel_user_id = ?, username = ?, status = 'active', updated_at = ?
       WHERE id = ?
    `),
    deletePlayer: db.prepare('DELETE FROM players WHERE id = ?'),
    balanceByPlayer: db.prepare('SELECT * FROM balance_cache WHERE player_id = ?'),
    upsertBalance: db.prepare(`
      INSERT INTO balance_cache (player_id, balance, currency, confirmed_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT (player_id) DO UPDATE SET
        balance = excluded.balance,
        currency = excluded.currency,
        confirmed_at = excluded.confirmed_at
    `),
    insertChatMessage: db.prepare(`
      INSERT INTO chat_messages (id, player_id, client_id, topic, text, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `),
    listChatMessages: db.prepare(`
      SELECT * FROM chat_messages WHERE player_id = ? ORDER BY created_at ASC LIMIT 200
    `),
    insertReceipt: db.prepare(`
      INSERT INTO chat_receipts
        (id, player_id, client_id, file_name, mime_type, size_bytes, stored_path, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `),
    ping: db.prepare('SELECT 1 AS ok'),
  }

  return {
    file,

    ping() {
      return statements.ping.get()?.ok === 1
    },

    getPlayerByClientId(clientId) {
      return normalizeRow(statements.playerByClientId.get(clientId))
    },

    getPlayerById(id) {
      return normalizeRow(statements.playerById.get(id))
    },

    getPlayerByToken(token) {
      return normalizeRow(statements.playerByToken.get(token))
    },

    getPlayerByUsername(username) {
      return normalizeRow(statements.playerByUsername.get(username))
    },

    insertPendingPlayer({
      id,
      clientId,
      name,
      username,
      accessToken,
      attribution = null,
      now,
    }) {
      statements.insertPlayer.run(
        id,
        clientId,
        name,
        username,
        accessToken,
        attribution ? JSON.stringify(attribution) : null,
        now,
        now,
      )
      return this.getPlayerById(id)
    },

    updatePendingUsername({ id, username, now }) {
      statements.updateUsername.run(username, now, id)
    },

    markCreationSent(id, nowValue) {
      statements.markCreationSent.run(nowValue, id)
    },

    resetCreationSent(id, nowValue) {
      statements.resetCreationSent.run(nowValue, id)
    },

    activatePlayer({ id, panelUserId, username, now }) {
      statements.activatePlayer.run(panelUserId, username, now, id)
      return this.getPlayerById(id)
    },

    deletePlayer(id) {
      statements.deletePlayer.run(id)
    },

    getBalanceCache(playerId) {
      return normalizeRow(statements.balanceByPlayer.get(playerId))
    },

    saveBalance({ playerId, balance, currency, confirmedAt }) {
      statements.upsertBalance.run(playerId, balance, currency, confirmedAt)
      return this.getBalanceCache(playerId)
    },

    saveChatMessage({ id, playerId, clientId, topic, text, now }) {
      statements.insertChatMessage.run(id, playerId, clientId ?? null, topic ?? null, text, now)
    },

    listChatMessages(playerId) {
      return statements.listChatMessages.all(playerId).map(normalizeRow)
    },

    saveReceipt({
      id,
      playerId,
      clientId,
      fileName,
      mimeType,
      sizeBytes,
      storedPath,
      now,
    }) {
      statements.insertReceipt.run(
        id,
        playerId,
        clientId ?? null,
        fileName ?? null,
        mimeType ?? null,
        sizeBytes ?? null,
        storedPath ?? null,
        now,
      )
    },

    close() {
      db.close()
    },
  }
}
