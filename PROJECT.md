# Hamal Command Center

A specialized dashboard for managing operations rooms (Hamal), personnel status, shifts, and reservists. This application provides a real-time overview of readiness and active deployments.

## 🚀 Technologies

- **Frontend:** React 19 (Vite)
- **Styling:** Tailwind CSS 4, Framer Motion (for animations and Siren Mode)
- **State Management:** React Context API (`src/store.tsx`)
- **Icons:** Lucide React
- **Charts:** Recharts (for analytics)
- **Drag & Drop:** `@hello-pangea/dnd` (likely for scheduling)
- **AI Integration:** `@google/genai` (potential for automated scheduling/analysis)
- **Backend/Data:** Express & Better-SQLite3 (available in dependencies for persistence/API)

## 📂 Project Structure

- `src/App.tsx`: Main entry point with layout and tab switching.
- `src/store.tsx`: Global state for personnel, shifts, and siren mode.
- `src/types.ts`: TypeScript definitions for `Personnel`, `Shift`, `PresenceStatus`, etc.
- `src/components/`:
  - `LiveBoard.tsx`: Real-time dashboard showing current status of all personnel.
  - `Reservists.tsx`: Management and tracking of reserve personnel.
  - `Scheduler.tsx`: Shift planning and duty rosters.
  - `SirenMode.tsx`: High-alert UI override triggered during emergencies.
  - `Sidebar.tsx`: Navigation and global controls.

## 🛠 Features

1. **Real-time Status Tracking:** Monitor whether personnel are at home, on shift, resting at base, or in transit.
2. **Siren Mode:** A global alert state that overrides the interface with emergency-focused UI.
3. **Shift Management:** Interactive scheduler for duty rotations.
4. **Reservist Management:** Tracking of call-ups and readiness of reserve forces.
5. **Analytics:** Visualized data on base hours and personnel availability.

## 🏃 Getting Started

1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Build for production: `npm run build`
