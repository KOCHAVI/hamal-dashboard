import express from 'express';
import { createClient } from '@libsql/client';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';
import dotenv from 'dotenv';
import Pusher from 'pusher';

dotenv.config();

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
const client = createClient({ url: url || 'file:local.db', authToken: authToken });

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || '',
  key: process.env.VITE_PUSHER_KEY || '',
  secret: process.env.PUSHER_SECRET || '',
  cluster: process.env.VITE_PUSHER_CLUSTER || '',
  useTLS: true,
});

const notifyClients = (event: string, data: any) => {
  pusher.trigger('hamal-channel', event, data).catch(e => console.error('Pusher error:', e));
};

let isInitialized = false;
const initDb = async () => {
  if (isInitialized) return;
  const queries = [
    `CREATE TABLE IF NOT EXISTS campaigns (id TEXT PRIMARY KEY, name TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT)`,
    `CREATE TABLE IF NOT EXISTS personnel (id TEXT PRIMARY KEY, full_name TEXT NOT NULL, team_id TEXT, is_reservist INTEGER DEFAULT 0, is_admin INTEGER DEFAULT 0, is_hot INTEGER DEFAULT 0, phone_number TEXT, emergency_phone_number TEXT, city TEXT, home_address TEXT, current_status TEXT DEFAULT 'בית', status_updated_at TEXT NOT NULL, status_note TEXT, FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE SET NULL)`,
    `CREATE TABLE IF NOT EXISTS teams (id TEXT PRIMARY KEY, name TEXT NOT NULL, leader_id TEXT NOT NULL, campaign_id TEXT NOT NULL, FOREIGN KEY (leader_id) REFERENCES personnel (id), FOREIGN KEY (campaign_id) REFERENCES campaigns (id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS shifts (id TEXT PRIMARY KEY, start_time TEXT NOT NULL, end_time TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS shift_personnel (shift_id TEXT NOT NULL, personnel_id TEXT NOT NULL, PRIMARY KEY (shift_id, personnel_id), FOREIGN KEY (shift_id) REFERENCES shifts (id) ON DELETE CASCADE, FOREIGN KEY (personnel_id) REFERENCES personnel (id) ON DELETE CASCADE)`,
    `INSERT OR IGNORE INTO personnel (id, full_name, is_admin, status_updated_at) VALUES ('admin-001', 'מנהל מערכת', 1, '2024-01-01T00:00:00.000Z')`
  ];
  try { for (const q of queries) await client.execute(q); isInitialized = true; } catch (err) { console.error('DB init error:', err); }
};

const app = express();
app.use(cors());
app.use(express.json());
app.use(async (req, res, next) => { await initDb(); next(); });

const verifyAccess = async (actorId: string, teamId?: string) => {
  try {
    const actorRes = await client.execute({ sql: 'SELECT id, is_admin, is_hot FROM personnel WHERE id = ?', args: [actorId] });
    const actor = actorRes.rows[0] as any;
    if (!actor) return false;
    if (actor.is_admin === 1) return true;
    if (teamId) {
      const teamRes = await client.execute({ sql: 'SELECT leader_id FROM teams WHERE id = ?', args: [teamId] });
      return teamRes.rows[0]?.leader_id === actorId;
    }
    return false;
  } catch (e) { return false; }
};

// --- DATA FETCH ---
app.get('/api/data', async (req, res) => {
  try {
    const c = await client.execute('SELECT id, name, start_date as startDate FROM campaigns');
    const t = await client.execute('SELECT id, name, leader_id as leaderId, campaign_id as campaignId FROM teams');
    const pRes = await client.execute(`SELECT id, full_name as fullName, team_id as teamId, is_reservist as isReservist, is_admin as isAdmin, is_hot as isHoT, phone_number as phoneNumber, current_status as currentStatus, status_updated_at as statusUpdatedAt, status_note as statusNote FROM personnel`);
    const p = pRes.rows.map((x: any) => ({ ...x, isReservist: !!x.isReservist, isAdmin: !!x.isAdmin, isHoT: !!x.isHoT }));
    const sRes = await client.execute('SELECT id, start_time as startTime, end_time as endTime FROM shifts');
    const s = [];
    for (const x of sRes.rows) {
      const pIds = await client.execute({ sql: 'SELECT personnel_id FROM shift_personnel WHERE shift_id = ?', args: [x.id as string] });
      s.push({ ...x, personnelIds: pIds.rows.map(r => r.personnel_id) });
    }
    res.json({ campaigns: c.rows, teams: t.rows, personnel: p, shifts: s });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// --- MUTATIONS ---

app.post('/api/campaigns', async (req, res) => {
  const { actor_id, name, start_date } = req.body;
  if (!(await verifyAccess(actor_id))) return res.status(403).json({ error: 'Unauthorized' });
  const id = uuidv4();
  try {
    await client.execute({ sql: 'INSERT INTO campaigns (id, name, start_date) VALUES (?, ?, ?)', args: [id, name, start_date] });
    notifyClients('campaign-upserted', { id, name, startDate: start_date });
    res.status(201).json({ id });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/campaigns/:id', async (req, res) => {
  const { actor_id } = req.query;
  if (!(await verifyAccess(actor_id as string))) return res.status(403).json({ error: 'Admin only' });
  try {
    await client.execute({ sql: 'DELETE FROM campaigns WHERE id = ?', args: [req.params.id] });
    notifyClients('campaign-deleted', { id: req.params.id });
    res.status(204).send();
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/api/teams/with-hot', async (req, res) => {
  const { actor_id, teamName, hotFullName, hotPhoneNumber, campaignId } = req.body;
  if (!(await verifyAccess(actor_id))) return res.status(403).json({ error: 'Unauthorized' });
  const hotId = uuidv4();
  const teamId = uuidv4();
  const now = new Date().toISOString();
  try {
    await client.batch([
      { sql: 'INSERT INTO personnel (id, full_name, phone_number, is_hot, status_updated_at) VALUES (?, ?, ?, 1, ?)', args: [hotId, hotFullName, hotPhoneNumber, now] },
      { sql: 'INSERT INTO teams (id, name, leader_id, campaign_id) VALUES (?, ?, ?, ?)', args: [teamId, teamName, hotId, campaignId] },
      { sql: 'UPDATE personnel SET team_id = ? WHERE id = ?', args: [teamId, hotId] }
    ], "write");
    
    // Notify about new team and new HoT
    notifyClients('team-upserted', { id: teamId, name: teamName, leaderId: hotId, campaignId });
    notifyClients('personnel-upserted', { id: hotId, fullName: hotFullName, phoneNumber: hotPhoneNumber, isHoT: true, teamId, statusUpdatedAt: now, currentStatus: 'בית' });
    res.status(201).json({ teamId, hotId });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/personnel', async (req, res) => {
  const { actor_id, full_name, team_id, is_reservist, phone_number, is_abroad } = req.body;
  if (!(await verifyAccess(actor_id, team_id))) return res.status(403).json({ error: 'Access denied' });
  const id = uuidv4();
  const initialStatus = is_abroad ? 'בחו"ל' : 'בית';
  const now = new Date().toISOString();
  try {
    await client.execute({
      sql: `INSERT INTO personnel (id, full_name, team_id, is_reservist, phone_number, current_status, status_updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, full_name, team_id, is_reservist ? 1 : 0, phone_number || null, initialStatus, now]
    });
    const newPerson = { id, fullName: full_name, teamId: team_id, isReservist: !!is_reservist, phoneNumber: phone_number, currentStatus: initialStatus, statusUpdatedAt: now };
    notifyClients('personnel-upserted', newPerson);
    res.status(201).json({ id });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/personnel/:id', async (req, res) => {
  const { actor_id, fullName, phoneNumber, teamId, isReservist, isAbroad } = req.body;
  const currentRes = await client.execute({ sql: 'SELECT team_id FROM personnel WHERE id = ?', args: [req.params.id] });
  const current = currentRes.rows[0] as any;
  if (!(await verifyAccess(actor_id, current?.team_id))) return res.status(403).json({ error: 'Unauthorized' });
  try {
    const initialStatus = isAbroad ? 'בחו"ל' : undefined;
    const sql = `UPDATE personnel SET full_name = ?, phone_number = ?, team_id = ?, is_reservist = ? ${initialStatus ? ', current_status = ?' : ''} WHERE id = ?`;
    const args = [fullName, phoneNumber, teamId || null, isReservist ? 1 : 0];
    if (initialStatus) args.push(initialStatus);
    args.push(req.params.id);
    await client.execute({ sql, args });
    
    // Fetch updated version to notify
    const updated = await client.execute({ sql: 'SELECT * FROM personnel WHERE id = ?', args: [req.params.id] });
    const row = updated.rows[0] as any;
    notifyClients('personnel-upserted', { id: row.id, fullName: row.full_name, teamId: row.team_id, isReservist: !!row.is_reservist, isHoT: !!row.is_hot, isAdmin: !!row.is_admin, phoneNumber: row.phone_number, currentStatus: row.current_status, statusUpdatedAt: row.status_updated_at, statusNote: row.status_note });
    
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/personnel/:id', async (req, res) => {
  const { actor_id } = req.query;
  const currentRes = await client.execute({ sql: 'SELECT team_id, is_admin FROM personnel WHERE id = ?', args: [req.params.id] });
  const current = currentRes.rows[0] as any;
  if (current?.is_admin || !(await verifyAccess(actor_id as string, current?.team_id))) return res.status(403).json({ error: 'Unauthorized' });
  try {
    await client.execute({ sql: 'DELETE FROM personnel WHERE id = ?', args: [req.params.id] });
    notifyClients('personnel-deleted', { id: req.params.id });
    res.status(204).send();
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/personnel/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body;
  const now = new Date().toISOString();
  try {
    await client.execute({ sql: 'UPDATE personnel SET current_status = ?, status_note = ?, status_updated_at = ? WHERE id = ?', args: [status, note || null, now, id] });
    // Partial update notification
    notifyClients('personnel-status-updated', { id, currentStatus: status, statusNote: note, statusUpdatedAt: now });
    res.json({ id, status, note, statusUpdatedAt: now });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/shifts/sync', async (req, res) => {
  const { actor_id, additions, removals } = req.body;
  try {
    const batchQueries: any[] = [];
    const findShiftId = async (start: string, end: string) => {
      const res = await client.execute({ sql: 'SELECT id FROM shifts WHERE datetime(start_time) = datetime(?) AND datetime(end_time) = datetime(?)', args: [start, end] });
      return res.rows[0]?.id as string | undefined;
    };
    if (removals) {
      for (const item of removals) {
        const sid = await findShiftId(item.start_time, item.end_time);
        if (sid) batchQueries.push({ sql: 'DELETE FROM shift_personnel WHERE shift_id = ? AND personnel_id = ?', args: [sid, item.personnel_id] });
      }
    }
    if (additions) {
      for (const item of additions) {
        let sid = await findShiftId(item.start_time, item.end_time);
        if (!sid) { sid = uuidv4(); batchQueries.push({ sql: 'INSERT INTO shifts (id, start_time, end_time) VALUES (?, ?, ?)', args: [sid, item.start_time, item.end_time] }); }
        batchQueries.push({ sql: 'INSERT OR IGNORE INTO shift_personnel (shift_id, personnel_id) VALUES (?, ?)', args: [sid, item.personnel_id] });
      }
    }
    if (batchQueries.length > 0) await client.batch(batchQueries, "write");
    await client.execute('DELETE FROM shifts WHERE id NOT IN (SELECT DISTINCT shift_id FROM shift_personnel)');
    
    // For shifts, we still do a full refresh trigger because the many-to-many logic is complex
    notifyClients('data-updated', { reason: 'shifts-synced' });
    res.status(200).json({ message: 'Sync successful' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/login/hot', async (req, res) => {
  const { phoneNumber } = req.body;
  try {
    const cleanInput = phoneNumber.replace(/\D/g, '');
    const pListRes = await client.execute('SELECT * FROM personnel WHERE is_hot = 1');
    const hot = pListRes.rows.find((p: any) => p.phone_number && p.phone_number.replace(/\D/g, '') === cleanInput) as any;
    if (hot) res.json({ id: hot.id, fullName: hot.full_name, teamId: hot.team_id, isReservist: !!hot.is_reservist, isAdmin: !!hot.is_admin, isHoT: !!hot.is_hot, phoneNumber: hot.phone_number, currentStatus: hot.current_status, statusUpdatedAt: hot.status_updated_at });
    else res.status(401).json({ error: 'Not found' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

export default app;
