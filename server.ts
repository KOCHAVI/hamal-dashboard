import express from 'express';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';

const db = new Database('hamal.db');
db.pragma('foreign_keys = ON');

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT
  );

  CREATE TABLE IF NOT EXISTS personnel (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    team_id TEXT,
    is_reservist INTEGER DEFAULT 0,
    is_admin INTEGER DEFAULT 0,
    is_hot INTEGER DEFAULT 0,
    phone_number TEXT,
    emergency_phone_number TEXT,
    city TEXT,
    home_address TEXT,
    current_status TEXT DEFAULT 'בית',
    status_updated_at TEXT NOT NULL,
    status_note TEXT
  );

  CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    leader_id TEXT NOT NULL,
    campaign_id TEXT NOT NULL,
    FOREIGN KEY (leader_id) REFERENCES personnel (id),
    FOREIGN KEY (campaign_id) REFERENCES campaigns (id)
  );

  -- New Many-to-Many Shift Schema
  CREATE TABLE IF NOT EXISTS shifts (
    id TEXT PRIMARY KEY,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS shift_personnel (
    shift_id TEXT NOT NULL,
    personnel_id TEXT NOT NULL,
    PRIMARY KEY (shift_id, personnel_id),
    FOREIGN KEY (shift_id) REFERENCES shifts (id) ON DELETE CASCADE,
    FOREIGN KEY (personnel_id) REFERENCES personnel (id) ON DELETE CASCADE
  );

  -- Seed Admin
  INSERT OR IGNORE INTO personnel (id, full_name, is_admin, status_updated_at)
  VALUES ('admin-001', 'מנהל מערכת', 1, '2024-01-01T00:00:00.000Z');
`);

const app = express();
app.use(cors());
app.use(express.json());

const verifyAccess = (actorId: string, teamId?: string) => {
  const actor = db.prepare('SELECT is_admin, is_hot FROM personnel WHERE id = ?').get(actorId) as any;
  if (!actor) return false;
  if (actor.is_admin === 1) return true;
  
  if (teamId && actor.is_hot === 1) {
    const team = db.prepare('SELECT leader_id FROM teams WHERE id = ?').get(teamId) as any;
    return team && team.leader_id === actorId;
  }
  return false;
};

// API Endpoints
app.get('/api/data', (req, res) => {
  const campaigns = db.prepare('SELECT id, name, start_date as startDate FROM campaigns').all();
  const teams = db.prepare('SELECT id, name, leader_id as leaderId, campaign_id as campaignId FROM teams').all();
  const personnel = db.prepare(`
    SELECT id, full_name as fullName, team_id as teamId, 
    is_reservist as isReservist, is_admin as isAdmin, is_hot as isHoT,
    phone_number as phoneNumber, current_status as currentStatus, 
    status_updated_at as statusUpdatedAt, status_note as statusNote
    FROM personnel
  `).all().map((p: any) => ({
    ...p,
    isReservist: !!p.isReservist,
    isAdmin: !!p.isAdmin,
    isHoT: !!p.isHoT
  }));

  // Fetch shifts with assigned personnel
  const shiftsRaw = db.prepare('SELECT id, start_time as startTime, end_time as endTime FROM shifts').all() as any[];
  const shifts = shiftsRaw.map(s => {
    const personnelIds = db.prepare('SELECT personnel_id FROM shift_personnel WHERE shift_id = ?').all(s.id) as any[];
    return { ...s, personnelIds: personnelIds.map(p => p.personnel_id) };
  });

  res.json({ campaigns, teams, personnel, shifts });
});

app.post('/api/campaigns', (req, res) => {
  const { name, start_date } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO campaigns (id, name, start_date) VALUES (?, ?, ?)').run(id, name, start_date);
  res.status(201).json({ id });
});

app.post('/api/hots', (req, res) => {
  const { actor_id, full_name, phoneNumber } = req.body;
  const actor = db.prepare('SELECT is_admin FROM personnel WHERE id = ?').get(actor_id) as any;
  if (!actor || actor.is_admin !== 1) return res.status(403).json({ error: 'Admin only' });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO personnel (id, full_name, is_hot, phone_number, status_updated_at)
    VALUES (?, ?, 1, ?, ?)
  `).run(id, full_name, phoneNumber || null, new Date().toISOString());
  res.status(201).json({ id });
});

app.post('/api/teams', (req, res) => {
  const { name, leader_id, campaign_id } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO teams (id, name, leader_id, campaign_id) VALUES (?, ?, ?, ?)').run(id, name, leader_id, campaign_id);
  db.prepare('UPDATE personnel SET team_id = ? WHERE id = ?').run(id, leader_id);
  res.status(201).json({ id });
});

app.post('/api/personnel', (req, res) => {
  const { actor_id, full_name, team_id, is_reservist, phone_number, is_abroad } = req.body;
  if (!verifyAccess(actor_id, team_id)) return res.status(403).json({ error: 'Access denied' });

  const id = uuidv4();
  const initialStatus = is_abroad ? 'בחו"ל' : 'בית';
  
  db.prepare(`
    INSERT INTO personnel (id, full_name, team_id, is_reservist, phone_number, current_status, status_updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, full_name, team_id, is_reservist ? 1 : 0, phone_number || null, initialStatus, new Date().toISOString());
  res.status(201).json({ id });
});

app.patch('/api/personnel/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body;
  const now = new Date().toISOString();
  db.prepare('UPDATE personnel SET current_status = ?, status_note = ?, status_updated_at = ? WHERE id = ?')
    .run(status, note || null, now, id);
  res.json({ id, status, note, statusUpdatedAt: now });
});

// MULTI-SOLDIER SHIFTS
app.post('/api/shifts', (req, res) => {
  const { actor_id, personnel_ids, start_time, end_time } = req.body;
  
  if (!personnel_ids || personnel_ids.length === 0) {
    return res.status(400).json({ error: 'At least one soldier is required.' });
  }

  // Permission check for each soldier
  for (const pid of personnel_ids) {
    const soldier = db.prepare('SELECT team_id FROM personnel WHERE id = ?').get(pid) as any;
    if (!soldier || !verifyAccess(actor_id, soldier.team_id)) {
      return res.status(403).json({ error: 'Unauthorized management for one or more soldiers.' });
    }
  }

  const shiftId = uuidv4();
  const insertShift = db.prepare('INSERT INTO shifts (id, start_time, end_time) VALUES (?, ?, ?)');
  const insertAssignment = db.prepare('INSERT INTO shift_personnel (shift_id, personnel_id) VALUES (?, ?)');

  const transaction = db.transaction(() => {
    insertShift.run(shiftId, start_time, end_time);
    for (const pid of personnel_ids) {
      insertAssignment.run(shiftId, pid);
    }
  });

  transaction();
  res.status(201).json({ id: shiftId, personnelIds: personnel_ids, startTime: start_time, endTime: end_time });
});

app.delete('/api/shifts/:id', (req, res) => {
  const { id } = req.params;
  const { actor_id } = req.query;
  
  const personnelIds = db.prepare('SELECT personnel_id FROM shift_personnel WHERE shift_id = ?').all(id) as any[];
  if (personnelIds.length === 0) return res.status(404).json({ error: 'Shift not found' });
  
  // Verify access for the first soldier (assuming team management)
  const soldier = db.prepare('SELECT team_id FROM personnel WHERE id = ?').get(personnelIds[0].personnel_id) as any;
  if (!verifyAccess(actor_id as string, soldier.team_id)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  db.prepare('DELETE FROM shifts WHERE id = ?').run(id);
  res.status(204).send();
});

app.patch('/api/shifts/:id', (req, res) => {
  const { id } = req.params;
  const { actor_id, start_time, end_time, personnel_ids } = req.body;

  if (personnel_ids && personnel_ids.length === 0) {
    return res.status(400).json({ error: 'At least one soldier is required.' });
  }

  const currentPersonnel = db.prepare('SELECT personnel_id FROM shift_personnel WHERE shift_id = ?').all(id) as any[];
  if (currentPersonnel.length === 0) return res.status(404).json({ error: 'Shift not found' });

  // Basic verify check
  const soldier = db.prepare('SELECT team_id FROM personnel WHERE id = ?').get(currentPersonnel[0].personnel_id) as any;
  if (!verifyAccess(actor_id, soldier.team_id)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const transaction = db.transaction(() => {
    db.prepare('UPDATE shifts SET start_time = ?, end_time = ? WHERE id = ?').run(start_time, end_time, id);
    
    if (personnel_ids) {
      db.prepare('DELETE FROM shift_personnel WHERE shift_id = ?').run(id);
      for (const pid of personnel_ids) {
        db.prepare('INSERT INTO shift_personnel (shift_id, personnel_id) VALUES (?, ?)').run(id, pid);
      }
    }
  });

  transaction();
  res.json({ id, start_time, end_time, personnelIds: personnel_ids });
});

// BULK MULTI-SOLDIER SHIFTS
app.post('/api/shifts/bulk', (req, res) => {
  const { actor_id, shifts } = req.body;
  
  if (!shifts || !Array.isArray(shifts) || shifts.length === 0) {
    return res.status(400).json({ error: 'Shifts array is required.' });
  }

  const transaction = db.transaction(() => {
    for (const shiftData of shifts) {
      const { personnel_ids, start_time, end_time } = shiftData;
      
      // Permission check for each soldier in each shift
      for (const pid of personnel_ids) {
        const soldier = db.prepare('SELECT team_id FROM personnel WHERE id = ?').get(pid) as any;
        if (!soldier || !verifyAccess(actor_id, soldier.team_id)) {
          throw new Error(`Unauthorized management for soldier ${pid}`);
        }
      }

      const shiftId = uuidv4();
      db.prepare('INSERT INTO shifts (id, start_time, end_time) VALUES (?, ?, ?)').run(shiftId, start_time, end_time);
      for (const pid of personnel_ids) {
        db.prepare('INSERT INTO shift_personnel (shift_id, personnel_id) VALUES (?, ?)').run(shiftId, pid);
      }
    }
  });

  try {
    transaction();
    res.status(201).json({ message: 'Shifts created successfully' });
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
});

app.post('/api/teams/with-hot', (req, res) => {
  const { teamName, hotFullName, hotPhoneNumber, campaignId } = req.body;
  
  if (!teamName || !hotFullName || !hotPhoneNumber || !campaignId) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const hotId = uuidv4();
  const teamId = uuidv4();
  const now = new Date().toISOString();

  const transaction = db.transaction(() => {
    // 1. Create the HoT
    db.prepare(`
      INSERT INTO personnel (id, full_name, phone_number, is_hot, status_updated_at)
      VALUES (?, ?, ?, 1, ?)
    `).run(hotId, hotFullName, hotPhoneNumber, now);

    // 2. Create the Team
    db.prepare(`
      INSERT INTO teams (id, name, leader_id, campaign_id)
      VALUES (?, ?, ?, ?)
    `).run(teamId, teamName, hotId, campaignId);

    // 3. Link HoT to the Team they lead
    db.prepare('UPDATE personnel SET team_id = ? WHERE id = ?').run(teamId, hotId);
  });

  try {
    transaction();
    res.status(201).json({ teamId, hotId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GRANULAR SYNC (Add/Remove assignments)
app.post('/api/shifts/sync', (req, res) => {
  const { actor_id, additions, removals } = req.body;

  const transaction = db.transaction(() => {
    // 1. Process Removals
    if (removals && Array.isArray(removals)) {
      for (const item of removals) {
        const { personnel_id, start_time, end_time } = item;
        
        // Find shift with flexible time matching
        const shift = db.prepare(`
          SELECT id FROM shifts 
          WHERE datetime(start_time) = datetime(?) 
          AND datetime(end_time) = datetime(?)
        `).get(start_time, end_time) as any;
        
        if (shift) {
          const soldier = db.prepare('SELECT team_id FROM personnel WHERE id = ?').get(personnel_id) as any;
          if (!soldier || !verifyAccess(actor_id, soldier.team_id)) {
            throw new Error(`Unauthorized to remove soldier ${personnel_id}`);
          }

          db.prepare('DELETE FROM shift_personnel WHERE shift_id = ? AND personnel_id = ?').run(shift.id, personnel_id);
          
          const remaining = db.prepare('SELECT COUNT(*) as count FROM shift_personnel WHERE shift_id = ?').get(shift.id) as any;
          if (remaining.count === 0) {
            db.prepare('DELETE FROM shifts WHERE id = ?').run(shift.id);
          }
        }
      }
    }

    // 2. Process Additions
    if (additions && Array.isArray(additions)) {
      for (const item of additions) {
        const { personnel_id, start_time, end_time } = item;

        const soldier = db.prepare('SELECT team_id FROM personnel WHERE id = ?').get(personnel_id) as any;
        if (!soldier || !verifyAccess(actor_id, soldier.team_id)) {
          throw new Error(`Unauthorized to add soldier ${personnel_id}`);
        }

        let shift = db.prepare(`
          SELECT id FROM shifts 
          WHERE datetime(start_time) = datetime(?) 
          AND datetime(end_time) = datetime(?)
        `).get(start_time, end_time) as any;

        if (!shift) {
          const shiftId = uuidv4();
          db.prepare('INSERT INTO shifts (id, start_time, end_time) VALUES (?, ?, ?)').run(shiftId, start_time, end_time);
          shift = { id: shiftId };
        }

        db.prepare('INSERT OR IGNORE INTO shift_personnel (shift_id, personnel_id) VALUES (?, ?)').run(shift.id, personnel_id);
      }
    }
  });

  try {
    transaction();
    res.status(200).json({ message: 'Sync successful' });
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
});

app.post('/api/login/hot', (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) return res.status(400).json({ error: 'Phone number required' });
  const cleanInput = phoneNumber.replace(/\D/g, '');
  const personnel = db.prepare('SELECT * FROM personnel WHERE is_hot = 1').all() as any[];
  const hot = personnel.find(p => p.phone_number && p.phone_number.replace(/\D/g, '') === cleanInput);
  if (hot) {
    res.json({
      id: hot.id,
      fullName: hot.full_name,
      teamId: hot.team_id,
      isReservist: !!hot.is_reservist,
      isAdmin: !!hot.is_admin,
      isHoT: !!hot.is_hot,
      phoneNumber: hot.phone_number,
      currentStatus: hot.current_status,
      statusUpdatedAt: hot.status_updated_at
    });
  } else {
    res.status(401).json({ error: 'Head of Team not found' });
  }
});

app.listen(3001, () => console.log('Server on 3001'));
