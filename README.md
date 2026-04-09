# ProjectPlanner

A visual swimlane Gantt planner with drag-and-drop tasks, dependencies, milestones, and shareable links.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| State | Zustand |
| Drag & Drop | Custom (mouse events) |
| Backend | Node.js + Fastify |
| Database | SQLite + Prisma |
| Sharing | NanoID short URLs |

---

## Prerequisites

- Node.js 18+
- Nothing else — SQLite is bundled, no database server needed

---

## Setup

### 1. Clone and install

```bash
git clone <your-repo>
cd project-planner
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure the backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="file:./dev.db"
PORT=3001
CORS_ORIGIN="http://localhost:5173"
```

The database is a single file (`backend/dev.db`) — no server, no credentials needed.

### 3. Run database migrations

```bash
cd backend
npm run db:push       # push schema to DB (dev)
# or
npm run db:migrate    # create migration files (recommended for production)
```

### 4. Start development servers

Open two terminals:

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Deployment

### Frontend → Vercel

```bash
cd frontend
npx vercel
```

Set environment variable: none needed (API calls go through `/api` proxy in dev; point to backend URL in prod via `VITE_API_BASE`).

### Backend → Railway / Render

1. Push repo to GitHub
2. Connect to Railway or Render
3. Set `DATABASE_URL` and `PORT` environment variables
4. Build command: `npm run build`
5. Start command: `node dist/index.js`

---

## Usage

### Creating a project
1. Open the app at `/`
2. Click **New Project**, enter a name
3. You're redirected to `/p/<id>` — share this URL with teammates

### Adding team members
- Click **Add member** (bottom-left of the planner)
- Click any member avatar to edit name, role, and color

### Adding tasks
- **Right-click** on any empty swimlane area → **Add task here**
- Click the task to edit title and description in the side panel
- Drag to move; drag the right-edge handle to resize
- Tasks snap to the current resolution (hour/day/week)

### Dependencies
- **Right-click** a task → **Add dependency**
- An arrow follows your mouse — click another task to connect them
- Press `Escape` to cancel

### Gates / Milestones
- **Right-click** empty grid → **Add gate here**
- Click the flag to edit label, description, color, and date

### Resolution
- Switch between **Hour / Day / Week** using the toolbar buttons

### Sharing
- Click **Share** in the top bar to copy the project URL

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `Escape` | Cancel drag / resize / dependency drawing / close context menu |

---

## Project Structure

```
project-planner/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma       # Database schema
│   └── src/
│       ├── index.ts            # Fastify server entry
│       ├── plugins/
│       │   └── prisma.ts       # DB plugin
│       └── routes/
│           ├── projects.ts
│           ├── members.ts
│           ├── tasks.ts
│           ├── dependencies.ts
│           └── gates.ts
└── frontend/
    └── src/
        ├── api/client.ts       # API calls
        ├── store/              # Zustand store
        ├── utils/
        │   ├── time.ts         # Grid math + snap-to-grid
        │   └── layout.ts       # Lane rows + cascade logic
        ├── pages/
        │   ├── LandingPage.tsx
        │   └── ProjectPage.tsx
        └── components/
            ├── planner/        # Grid, swimlanes, tasks, arrows, gates
            ├── panels/         # Side panels
            └── menus/          # Context menus
```
