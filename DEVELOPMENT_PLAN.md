# Development Plan: Persistence & Team Management

This plan outlines the integration of SQLite for data persistence and the implementation of role-based team management for the Hamal Command Center.

## 🏗 Architecture Overview

The project will transition from a pure frontend application to a **Client-Server architecture**:
- **Backend:** Express.js server using `better-sqlite3` for local persistence.
- **Frontend:** React application communicating with the backend via a REST API.
- **Data Flow:** React components -> Context Store (fetching from API) -> Express Server -> SQLite.

## 🗄 Database Schema (SQLite)

### 1. `campaigns`
- `id`: TEXT (UUID) PRIMARY KEY
- `name`: TEXT
- `start_date`: TEXT (ISO)
- `end_date`: TEXT (ISO, nullable)

### 2. `teams`
- `id`: TEXT (UUID) PRIMARY KEY
- `name`: TEXT
- `leader_id`: TEXT (Foreign Key to `personnel.id`)
- `campaign_id`: TEXT (Foreign Key to `campaigns.id`)

### 3. `personnel` (Soldiers)
- `id`: TEXT (UUID) PRIMARY KEY
- `full_name`: TEXT
- `team_id`: TEXT (Foreign Key to `teams.id`, nullable)
- `role`: TEXT
- `is_reservist`: INTEGER (Boolean 0/1)
- `phone_number`: TEXT
- `emergency_phone_number`: TEXT
- `city`: TEXT
- `home_address`: TEXT
- `current_status`: TEXT (Enum: HOME, BASE_SHIFT, etc.)
- `status_updated_at`: TEXT (ISO)
- `status_note`: TEXT (nullable)

### 4. `shifts`
- `id`: TEXT (UUID) PRIMARY KEY
- `personnel_id`: TEXT (Foreign Key to `personnel.id`)
- `start_time`: TEXT (ISO)
- `end_time`: TEXT (ISO)

## 🚦 API Endpoints

- `GET /api/data`: Fetch all initial data (campaigns, teams, personnel).
- `POST /api/campaigns`: Create a new campaign.
- `POST /api/teams`: Create a new team and assign a Head of Team (HoT).
- `POST /api/personnel`: Create a new soldier (Requires HoT verification).
- `PATCH /api/personnel/:id`: Update soldier status or details.
- `POST /api/shifts`: Create/Manage shifts (Requires HoT verification).

## 🛡 Access Control & Role Logic

### Head of Team (HoT) Permissions
To implement the requirement that "only the head of team can create his soldiers and manage his shifts," we will:
1.  **Simulation:** Since a full auth system isn't requested yet, we will add a "Login as" or "Acting as" selector in the UI to simulate the HoT identity.
2.  **Validation Logic:**
    - When creating a soldier, the API will verify that the `requested_by` ID matches the `leader_id` of the `team_id` provided.
    - When creating a shift, the API will verify that the soldier belongs to a team led by the `requested_by` ID.
3.  **UI Restrictions:**
    - The "Add Soldier" and "Add Shift" buttons will only be active/visible if the active user is the leader of the selected team.

## 🛠 Implementation Steps

1.  **Backend Setup:** Initialize `server.ts` with Express and SQLite tables.
2.  **API Implementation:** Build the CRUD endpoints with validation logic.
3.  **Frontend Refactor:** 
    - Update `src/store.tsx` to use `fetch` for all state updates.
    - Create a management dashboard for Campaigns and Teams.
    - Create the Soldier creation form (visible only to HoTs).
4.  **Validation:** Ensure the database correctly enforces foreign keys and the API enforces leadership rules.
