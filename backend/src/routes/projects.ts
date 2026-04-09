import { FastifyInstance } from 'fastify'
import { customAlphabet } from 'nanoid'
import prisma from '../lib/prisma'

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 8)

export default async function projectRoutes(fastify: FastifyInstance) {
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

  fastify.post<{ Body: { title: string } }>('/projects', async (req, reply) => {
    const { title } = req.body
    if (!title?.trim()) return reply.status(400).send({ error: 'Title is required' })
    const project = await prisma.project.create({ data: { id: nanoid(), title: title.trim() } })
    return reply.status(201).send(project)
  })

  fastify.patch<{ Params: { id: string }; Body: { title: string } }>('/projects/:id', async (req, reply) => {
    const project = await prisma.project.update({ where: { id: req.params.id }, data: { title: req.body.title } })
    return project
  })
}
