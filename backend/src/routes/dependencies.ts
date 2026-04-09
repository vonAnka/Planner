import { FastifyInstance } from 'fastify'
import prisma from '../lib/prisma'

export default async function dependencyRoutes(fastify: FastifyInstance) {
  fastify.post<{ Params: { taskId: string }; Body: { toTaskId: string } }>('/tasks/:taskId/dependencies', async (req, reply) => {
    const fromTaskId = req.params.taskId
    const { toTaskId } = req.body
    if (fromTaskId === toTaskId) return reply.status(400).send({ error: 'Cannot create self-dependency' })
    if (await checkCycle(fromTaskId, toTaskId)) return reply.status(400).send({ error: 'Would create circular dependency' })
    const dep = await prisma.dependency.create({ data: { fromTaskId, toTaskId } })
    return reply.status(201).send(dep)
  })

  fastify.delete<{ Params: { id: string } }>('/dependencies/:id', async (req, reply) => {
    await prisma.dependency.delete({ where: { id: req.params.id } })
    return reply.status(204).send()
  })
}

async function checkCycle(from: string, to: string): Promise<boolean> {
  const visited = new Set<string>()
  const queue = [from]
  while (queue.length) {
    const current = queue.shift()!
    if (current === to) return true
    if (visited.has(current)) continue
    visited.add(current)
    const parents = await prisma.dependency.findMany({ where: { toTaskId: current }, select: { fromTaskId: true } })
    queue.push(...parents.map((p) => p.fromTaskId))
  }
  return false
}
