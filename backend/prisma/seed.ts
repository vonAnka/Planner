/**
 * seed.ts — SQLite → PostgreSQL migration helper
 *
 * Export local data:
 *   npx ts-node --project tsconfig.seed.json prisma/seed.ts export
 *
 * Import into production (set DATABASE_URL to the Railway PostgreSQL URL first):
 *   npx ts-node --project tsconfig.seed.json prisma/seed.ts import
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()
const SEED_FILE = path.resolve(__dirname, 'seed-data.json')

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SeedData {
  exportedAt: string
  projects: ProjectRecord[]
  teamMembers: TeamMemberRecord[]
  tasks: TaskRecord[]
  dependencies: DependencyRecord[]
  gates: GateRecord[]
}

interface ProjectRecord {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

interface TeamMemberRecord {
  id: string
  projectId: string
  name: string
  role: string
  color: string
  avatarInitials: string
  order: number
}

interface TaskRecord {
  id: string
  projectId: string
  memberId: string
  title: string
  description: string
  startTime: number
  duration: number
  done: boolean
  laneRow: number
}

interface DependencyRecord {
  id: string
  fromTaskId: string
  toTaskId: string
}

interface GateRecord {
  id: string
  projectId: string
  position: number
  label: string
  description: string
  color: string
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

async function exportData(): Promise<void> {
  console.log('🔍  Reading data from database…')

  const [projects, teamMembers, tasks, dependencies, gates] = await Promise.all([
    prisma.project.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.teamMember.findMany({ orderBy: { order: 'asc' } }),
    prisma.task.findMany(),
    prisma.dependency.findMany(),
    prisma.gate.findMany({ orderBy: { position: 'asc' } }),
  ])

  const seedData: SeedData = {
    exportedAt: new Date().toISOString(),
    projects: projects.map((p) => ({
      id: p.id,
      title: p.title,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
    teamMembers: teamMembers.map((m) => ({
      id: m.id,
      projectId: m.projectId,
      name: m.name,
      role: m.role,
      color: m.color,
      avatarInitials: m.avatarInitials,
      order: m.order,
    })),
    tasks: tasks.map((t) => ({
      id: t.id,
      projectId: t.projectId,
      memberId: t.memberId,
      title: t.title,
      description: t.description,
      startTime: t.startTime,
      duration: t.duration,
      done: t.done,
      laneRow: t.laneRow,
    })),
    dependencies: dependencies.map((d) => ({
      id: d.id,
      fromTaskId: d.fromTaskId,
      toTaskId: d.toTaskId,
    })),
    gates: gates.map((g) => ({
      id: g.id,
      projectId: g.projectId,
      position: g.position,
      label: g.label,
      description: g.description,
      color: g.color,
    })),
  }

  fs.writeFileSync(SEED_FILE, JSON.stringify(seedData, null, 2), 'utf-8')

  console.log(`✅  Export complete → ${SEED_FILE}`)
  console.log(`    Projects:     ${projects.length}`)
  console.log(`    TeamMembers:  ${teamMembers.length}`)
  console.log(`    Tasks:        ${tasks.length}`)
  console.log(`    Dependencies: ${dependencies.length}`)
  console.log(`    Gates:        ${gates.length}`)
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

async function importData(): Promise<void> {
  if (!fs.existsSync(SEED_FILE)) {
    console.error(`❌  Seed file not found: ${SEED_FILE}`)
    console.error('    Run the export step first: npx ts-node prisma/seed.ts export')
    process.exit(1)
  }

  const raw = fs.readFileSync(SEED_FILE, 'utf-8')
  const data: SeedData = JSON.parse(raw)

  console.log(`📦  Importing data exported at ${data.exportedAt}`)
  console.log(`    Projects:     ${data.projects.length}`)
  console.log(`    TeamMembers:  ${data.teamMembers.length}`)
  console.log(`    Tasks:        ${data.tasks.length}`)
  console.log(`    Dependencies: ${data.dependencies.length}`)
  console.log(`    Gates:        ${data.gates.length}`)
  console.log('')

  // Wrap everything in a transaction so the database is never left in a
  // partially-imported state.
  await prisma.$transaction(
    async (tx) => {
      // ── 1. Projects ──────────────────────────────────────────────────────
      console.log('  Upserting projects…')
      for (const p of data.projects) {
        await tx.project.upsert({
          where: { id: p.id },
          create: {
            id: p.id,
            title: p.title,
            createdAt: new Date(p.createdAt),
            updatedAt: new Date(p.updatedAt),
          },
          update: {
            title: p.title,
            updatedAt: new Date(p.updatedAt),
          },
        })
      }

      // ── 2. TeamMembers ───────────────────────────────────────────────────
      console.log('  Upserting team members…')
      for (const m of data.teamMembers) {
        await tx.teamMember.upsert({
          where: { id: m.id },
          create: {
            id: m.id,
            projectId: m.projectId,
            name: m.name,
            role: m.role,
            color: m.color,
            avatarInitials: m.avatarInitials,
            order: m.order,
          },
          update: {
            name: m.name,
            role: m.role,
            color: m.color,
            avatarInitials: m.avatarInitials,
            order: m.order,
          },
        })
      }

      // ── 3. Tasks ─────────────────────────────────────────────────────────
      console.log('  Upserting tasks…')
      for (const t of data.tasks) {
        await tx.task.upsert({
          where: { id: t.id },
          create: {
            id: t.id,
            projectId: t.projectId,
            memberId: t.memberId,
            title: t.title,
            description: t.description,
            startTime: t.startTime,
            duration: t.duration,
            done: t.done,
            laneRow: t.laneRow,
          },
          update: {
            title: t.title,
            description: t.description,
            startTime: t.startTime,
            duration: t.duration,
            done: t.done,
            laneRow: t.laneRow,
          },
        })
      }

      // ── 4. Dependencies ──────────────────────────────────────────────────
      console.log('  Upserting dependencies…')
      for (const d of data.dependencies) {
        await tx.dependency.upsert({
          where: { id: d.id },
          create: {
            id: d.id,
            fromTaskId: d.fromTaskId,
            toTaskId: d.toTaskId,
          },
          update: {}, // the pair is the identity — nothing else to update
        })
      }

      // ── 5. Gates ─────────────────────────────────────────────────────────
      console.log('  Upserting gates…')
      for (const g of data.gates) {
        await tx.gate.upsert({
          where: { id: g.id },
          create: {
            id: g.id,
            projectId: g.projectId,
            position: g.position,
            label: g.label,
            description: g.description,
            color: g.color,
          },
          update: {
            position: g.position,
            label: g.label,
            description: g.description,
            color: g.color,
          },
        })
      }
    },
    {
      // Large datasets can take a while; give the transaction plenty of time.
      timeout: 60_000,
    },
  )

  console.log('')
  console.log('✅  Import complete.')
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const command = process.argv[2]

  if (command === 'export') {
    await exportData()
  } else if (command === 'import') {
    await importData()
  } else {
    console.error('Usage:')
    console.error('  npx ts-node --project tsconfig.seed.json prisma/seed.ts export')
    console.error('  npx ts-node --project tsconfig.seed.json prisma/seed.ts import')
    process.exit(1)
  }
}

main()
  .catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
