import { FastifyInstance } from 'fastify'
import { customAlphabet } from 'nanoid'
import prisma from '../lib/prisma'

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 8)

export default async function projectRoutes(fastify: FastifyInstance) {
  // GET /projects — list all projects
  fastify.get('/projects', async (_req, reply) => {
    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { members: true, tasks: true }
        }
      }
    })
    return projects
  })

  // GET /projects/:id — load full project
  fastify.get<{ Params: { id: string } }>('/projects/:id', async (req, reply) => {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        members: { orderBy: { order: 'asc' } },
        tasks: { include: { children: true, parents: true }, orderBy: { startTime: 'asc' } },
        gates: { orderBy: { position: 'asc' } },
      },
    })
    if (!project) return reply.status(404).send({ error: 'Project not found' })
    return project
  })

  // POST /projects — create new project
  fastify.post<{ Body: { title: string } }>('/projects', async (req, reply) => {
    const { title } = req.body
    if (!title?.trim()) return reply.status(400).send({ error: 'Title is required' })
    const project = await prisma.project.create({ data: { id: nanoid(), title: title.trim() } })
    return reply.status(201).send(project)
  })

  // PATCH /projects/:id — rename project
  fastify.patch<{ Params: { id: string }; Body: { title: string } }>('/projects/:id', async (req, reply) => {
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: { title: req.body.title }
    })
    return project
  })

  // DELETE /projects/:id — delete project
  fastify.delete<{ Params: { id: string } }>('/projects/:id', async (req, reply) => {
    await prisma.project.delete({ where: { id: req.params.id } })
    return reply.status(204).send()
  })
}
