import express from 'express';
import { createClient } from '@libsql/client';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

// Database Setup
const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url && process.env.NODE_ENV === 'production') {
  console.error('CRITICAL: TURSO_DATABASE_URL is not defined in production!');
}

const client = createClient({
  url: url || 'file:local.db',
  authToken: authToken,
});

// Helper to run raw SQL (compatible with previous db.exec)
const initDb = async () => {
  if (!url && process.env.NODE_ENV === 'production') return;
...
  try {
    for (const q of queries) {
      await client.execute(q);
    }
    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Database initialization failed:', err);
  }
};

initDb().catch(console.error);

const app = express();
app.use(cors());
app.use(express.json());

const verifyAccess = async (actorId: string, teamId?: string) => {
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
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', node_env: process.env.NODE_ENV, has_db_url: !!process.env.TURSO_DATABASE_URL });
});

// API Endpoints
app.get('/api/data', async (req, res) => {
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
});

app.post('/api/campaigns', async (req, res) => {
  const { name, start_date } = req.body;
  const id = uuidv4();
  await client.execute({
    sql: 'INSERT INTO campaigns (id, name, start_date) VALUES (?, ?, ?)',
    args: [id, name, start_date]
  });
  res.status(201).json({ id });
});

app.post('/api/teams/with-hot', async (req, res) => {
  const { teamName, hotFullName, hotPhoneNumber, campaignId } = req.body;
  const hotId = uuidv4();
  const teamId = uuidv4();
  const now = new Date().toISOString();
  
  await client.batch([
    { sql: 'INSERT INTO personnel (id, full_name, phone_number, is_hot, status_updated_at) VALUES (?, ?, ?, 1, ?)', args: [hotId, hotFullName, hotPhoneNumber, now] },
    { sql: 'INSERT INTO teams (id, name, leader_id, campaign_id) VALUES (?, ?, ?, ?)', args: [teamId, teamName, hotId, campaignId] },
    { sql: 'UPDATE personnel SET team_id = ? WHERE id = ?', args: [teamId, hotId] }
  ], "write");
  
  res.status(201).json({ teamId, hotId });
});

app.post('/api/personnel', async (req, res) => {
  const { actor_id, full_name, team_id, is_reservist, phone_number, is_abroad } = req.body;
  if (!(await verifyAccess(actor_id, team_id))) return res.status(403).json({ error: 'Access denied' });
  const id = uuidv4();
  const initialStatus = is_abroad ? 'בחו"ל' : 'בית';
  await client.execute({
    sql: `INSERT INTO personnel (id, full_name, team_id, is_reservist, phone_number, current_status, status_updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [id, full_name, team_id, is_reservist ? 1 : 0, phone_number || null, initialStatus, new Date().toISOString()]
  });
  res.status(201).json({ id });
});

app.patch('/api/personnel/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body;
  const now = new Date().toISOString();
  await client.execute({
    sql: 'UPDATE personnel SET current_status = ?, status_note = ?, status_updated_at = ? WHERE id = ?',
    args: [status, note || null, now, id]
  });
  res.json({ id, status, note, statusUpdatedAt: now });
});

app.post('/api/shifts/sync', async (req, res) => {
  const { actor_id, additions, removals } = req.body;
  const batchQueries = [];

  if (removals) {
    for (const item of removals) {
      const shiftRes = await client.execute({
        sql: 'SELECT id FROM shifts WHERE datetime(start_time) = datetime(?) AND datetime(end_time) = datetime(?)',
        args: [item.start_time, item.end_time]
      });
      const shift = shiftRes.rows[0];
      if (shift) {
        batchQueries.push({ sql: 'DELETE FROM shift_personnel WHERE shift_id = ? AND personnel_id = ?', args: [shift.id as string, item.personnel_id] });
        // Cleanup check would need to be outside batch or separate transaction
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
    await client.batch(batchQueries as any, "write");
  }
  
  res.status(200).json({ message: 'Sync successful' });
});

app.post('/api/login/hot', async (req, res) => {
  const { phoneNumber } = req.body;
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
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
