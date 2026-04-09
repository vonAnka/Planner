import { FastifyInstance } from 'fastify'
import prisma from '../lib/prisma'

export default async function gateRoutes(fastify: FastifyInstance) {
  fastify.post<{ Params: { projectId: string }; Body: { position: number; label?: string; color?: string } }>('/projects/:projectId/gates', async (req, reply) => {
    const { position, label = 'Milestone', color = '#F59E0B' } = req.body
    const gate = await prisma.gate.create({ data: { projectId: req.params.projectId, position, label, color } })
    return reply.status(201).send(gate)
  })

  fastify.patch<{ Params: { id: string }; Body: { label?: string; description?: string; color?: string; position?: number } }>('/gates/:id', async (req, reply) => {
    const gate = await prisma.gate.update({ where: { id: req.params.id }, data: req.body })
    return gate
  })

  fastify.delete<{ Params: { id: string } }>('/gates/:id', async (req, reply) => {
    await prisma.gate.delete({ where: { id: req.params.id } })
    return reply.status(204).send()
  })
}
