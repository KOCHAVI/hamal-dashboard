import express from 'express';
import { createClient } from '@libsql/client';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

// Database Setup
const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({
  url: url || 'file:local.db',
  authToken: authToken,
});

let isInitialized = false;

// Initialize Database Schema
const initDb = async () => {
  if (isInitialized) return;
  
  const queries = [
    `CREATE TABLE IF NOT EXISTS campaigns (id TEXT PRIMARY KEY, name TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT)`,
    `CREATE TABLE IF NOT EXISTS personnel (id TEXT PRIMARY KEY, full_name TEXT NOT NULL, team_id TEXT, is_reservist INTEGER DEFAULT 0, is_admin INTEGER DEFAULT 0, is_hot INTEGER DEFAULT 0, phone_number TEXT, emergency_phone_number TEXT, city TEXT, home_address TEXT, current_status TEXT DEFAULT 'בית', status_updated_at TEXT NOT NULL, status_note TEXT)`,
    `CREATE TABLE IF NOT EXISTS teams (id TEXT PRIMARY KEY, name TEXT NOT NULL, leader_id TEXT NOT NULL, campaign_id TEXT NOT NULL, FOREIGN KEY (leader_id) REFERENCES personnel (id), FOREIGN KEY (campaign_id) REFERENCES campaigns (id))`,
    `CREATE TABLE IF NOT EXISTS shifts (id TEXT PRIMARY KEY, start_time TEXT NOT NULL, end_time TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS shift_personnel (shift_id TEXT NOT NULL, personnel_id TEXT NOT NULL, PRIMARY KEY (shift_id, personnel_id), FOREIGN KEY (shift_id) REFERENCES shifts (id) ON DELETE CASCADE, FOREIGN KEY (personnel_id) REFERENCES personnel (id) ON DELETE CASCADE)`,
    `INSERT OR IGNORE INTO personnel (id, full_name, is_admin, status_updated_at) VALUES ('admin-001', 'מנהל מערכת', 1, '2024-01-01T00:00:00.000Z')`
  ];

  try {
    for (const q of queries) {
      await client.execute(q);
    }
    isInitialized = true;
    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Database initialization failed:', err);
  }
};

const app = express();
app.use(cors());
app.use(express.json());

// Middleware to ensure DB is ready
app.use(async (req, res, next) => {
  await initDb();
  next();
});

const verifyAccess = async (actorId: string, teamId?: string) => {
  try {
    const actorRes = await client.execute({
      sql: 'SELECT is_admin, is_hot FROM personnel WHERE id = ?',
      args: [actorId]
    });
    const actor = actorRes.rows[0];
    if (!actor) return false;
    if (actor.is_admin === 1) return true;
    if (teamId && actor.is_hot === 1) {
      const teamRes = await client.execute({
        sql: 'SELECT leader_id FROM teams WHERE id = ?',
        args: [teamId]
      });
      const team = teamRes.rows[0];
      return team && team.leader_id === actorId;
    }
    return false;
  } catch (e) {
    return false;
  }
};

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    node_env: process.env.NODE_ENV, 
    has_db_url: !!process.env.TURSO_DATABASE_URL,
    is_initialized: isInitialized
  });
});

app.get('/api/data', async (req, res) => {
  try {
    const campaignsRes = await client.execute('SELECT id, name, start_date as startDate FROM campaigns');
    const teamsRes = await client.execute('SELECT id, name, leader_id as leaderId, campaign_id as campaignId FROM teams');
    const personnelRes = await client.execute(`
      SELECT id, full_name as fullName, team_id as teamId, 
      is_reservist as isReservist, is_admin as isAdmin, is_hot as isHoT,
      phone_number as phoneNumber, current_status as currentStatus, 
      status_updated_at as statusUpdatedAt, status_note as statusNote
      FROM personnel
    `);

    const personnel = personnelRes.rows.map((p: any) => ({
      ...p,
      isReservist: !!p.isReservist,
      isAdmin: !!p.isAdmin,
      isHoT: !!p.isHoT
    }));

    const shiftsRes = await client.execute('SELECT id, start_time as startTime, end_time as endTime FROM shifts');
    const shiftsWithP = [];
    for (const s of shiftsRes.rows) {
      const pIds = await client.execute({
        sql: 'SELECT personnel_id FROM shift_personnel WHERE shift_id = ?',
        args: [s.id as string]
      });
      shiftsWithP.push({ ...s, personnelIds: pIds.rows.map(row => row.personnel_id) });
    }

    res.json({ campaigns: campaignsRes.rows, teams: teamsRes.rows, personnel, shifts: shiftsWithP });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/campaigns', async (req, res) => {
  const { name, start_date } = req.body;
  const id = uuidv4();
  try {
    await client.execute({
      sql: 'INSERT INTO campaigns (id, name, start_date) VALUES (?, ?, ?)',
      args: [id, name, start_date]
    });
    res.status(201).json({ id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/teams/with-hot', async (req, res) => {
  const { teamName, hotFullName, hotPhoneNumber, campaignId } = req.body;
  const hotId = uuidv4();
  const teamId = uuidv4();
  const now = new Date().toISOString();
  
  try {
    await client.batch([
      { sql: 'INSERT INTO personnel (id, full_name, phone_number, is_hot, status_updated_at) VALUES (?, ?, ?, 1, ?)', args: [hotId, hotFullName, hotPhoneNumber, now] },
      { sql: 'INSERT INTO teams (id, name, leader_id, campaign_id) VALUES (?, ?, ?, ?)', args: [teamId, teamName, hotId, campaignId] },
      { sql: 'UPDATE personnel SET team_id = ? WHERE id = ?', args: [teamId, hotId] }
    ], "write");
    res.status(201).json({ teamId, hotId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/personnel', async (req, res) => {
  const { actor_id, full_name, team_id, is_reservist, phone_number, is_abroad } = req.body;
  if (!(await verifyAccess(actor_id, team_id))) return res.status(403).json({ error: 'Access denied' });
  const id = uuidv4();
  const initialStatus = is_abroad ? 'בחו"ל' : 'בית';
  try {
    await client.execute({
      sql: `INSERT INTO personnel (id, full_name, team_id, is_reservist, phone_number, current_status, status_updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, full_name, team_id, is_reservist ? 1 : 0, phone_number || null, initialStatus, new Date().toISOString()]
    });
    res.status(201).json({ id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/personnel/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body;
  const now = new Date().toISOString();
  try {
    await client.execute({
      sql: 'UPDATE personnel SET current_status = ?, status_note = ?, status_updated_at = ? WHERE id = ?',
      args: [status, note || null, now, id]
    });
    res.json({ id, status, note, statusUpdatedAt: now });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/shifts/sync', async (req, res) => {
  const { actor_id, additions, removals } = req.body;
  const batchQueries: any[] = [];

  try {
    if (removals) {
      for (const item of removals) {
        const shiftRes = await client.execute({
          sql: 'SELECT id FROM shifts WHERE datetime(start_time) = datetime(?) AND datetime(end_time) = datetime(?)',
          args: [item.start_time, item.end_time]
        });
        const shift = shiftRes.rows[0];
        if (shift) {
          batchQueries.push({ sql: 'DELETE FROM shift_personnel WHERE shift_id = ? AND personnel_id = ?', args: [shift.id as string, item.personnel_id] });
        }
      }
    }

    if (additions) {
      for (const item of additions) {
        let shiftRes = await client.execute({
          sql: 'SELECT id FROM shifts WHERE datetime(start_time) = datetime(?) AND datetime(end_time) = datetime(?)',
          args: [item.start_time, item.end_time]
        });
        let shiftId = shiftRes.rows[0]?.id as string;
        if (!shiftId) {
          shiftId = uuidv4();
          batchQueries.push({ sql: 'INSERT INTO shifts (id, start_time, end_time) VALUES (?, ?, ?)', args: [shiftId, item.start_time, item.end_time] });
        }
        batchQueries.push({ sql: 'INSERT OR IGNORE INTO shift_personnel (shift_id, personnel_id) VALUES (?, ?)', args: [shiftId, item.personnel_id] });
      }
    }

    if (batchQueries.length > 0) {
      await client.batch(batchQueries, "write");
    }
    
    res.status(200).json({ message: 'Sync successful' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login/hot', async (req, res) => {
  const { phoneNumber } = req.body;
  try {
    const cleanInput = phoneNumber.replace(/\D/g, '');
    const pListRes = await client.execute('SELECT * FROM personnel WHERE is_hot = 1');
    const hot = pListRes.rows.find((p: any) => p.phone_number && p.phone_number.replace(/\D/g, '') === cleanInput) as any;
    if (hot) {
      res.json({
        id: hot.id, fullName: hot.full_name, teamId: hot.team_id,
        isReservist: !!hot.is_reservist, isAdmin: !!hot.is_admin, isHoT: !!hot.is_hot,
        phoneNumber: hot.phone_number, currentStatus: hot.current_status, statusUpdatedAt: hot.status_updated_at
      });
    } else {
      res.status(401).json({ error: 'Not found' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
