import { FastifyInstance } from 'fastify'
import prisma from '../lib/prisma'

export default async function taskRoutes(fastify: FastifyInstance) {
  fastify.post<{ Params: { projectId: string }; Body: { memberId: string; title: string; startTime: number; duration: number } }>('/projects/:projectId/tasks', async (req, reply) => {
    const { memberId, title, startTime, duration } = req.body
    const task = await prisma.task.create({
      data: { projectId: req.params.projectId, memberId, title: title ?? 'New Task', startTime, duration: duration ?? 480 },
      include: { children: true, parents: true },
    })
    return reply.status(201).send(task)
  })

  fastify.patch<{ Params: { id: string }; Body: Record<string, unknown> }>('/tasks/:id', async (req, reply) => {
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: req.body,
      include: { children: true, parents: true },
    })
    return task
  })

  fastify.patch<{ Body: { updates: Array<{ id: string; startTime: number; laneRow?: number }> } }>('/tasks/batch', async (req, reply) => {
    const { updates } = req.body
    const results = await Promise.all(
      updates.map(({ id, startTime, laneRow }) =>
        prisma.task.update({ where: { id }, data: { startTime, ...(laneRow !== undefined ? { laneRow } : {}) } })
      )
    )
    return results
  })

  fastify.delete<{ Params: { id: string } }>('/tasks/:id', async (req, reply) => {
    await prisma.task.delete({ where: { id: req.params.id } })
    return reply.status(204).send()
  })
}
