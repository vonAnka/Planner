import { FastifyInstance } from 'fastify'
import prisma from '../lib/prisma'

export default async function memberRoutes(fastify: FastifyInstance) {
  fastify.post<{ Params: { projectId: string }; Body: { name: string; role?: string; color?: string } }>('/projects/:projectId/members', async (req, reply) => {
    const { name, role = '', color = '#4F6EF7' } = req.body
    if (!name?.trim()) return reply.status(400).send({ error: 'Name is required' })
    const count = await prisma.teamMember.count({ where: { projectId: req.params.projectId } })
    const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    const member = await prisma.teamMember.create({
      data: { projectId: req.params.projectId, name: name.trim(), role, color, avatarInitials: initials, order: count },
    })
    return reply.status(201).send(member)
  })

  fastify.patch<{ Params: { id: string }; Body: { name?: string; role?: string; color?: string; order?: number } }>('/members/:id', async (req, reply) => {
    const { name, role, color, order } = req.body
    const data: Record<string, unknown> = {}
    if (name !== undefined) { data.name = name; data.avatarInitials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() }
    if (role !== undefined) data.role = role
    if (color !== undefined) data.color = color
    if (order !== undefined) data.order = order
    const member = await prisma.teamMember.update({ where: { id: req.params.id }, data })
    return member
  })

  fastify.delete<{ Params: { id: string } }>('/members/:id', async (req, reply) => {
    await prisma.teamMember.delete({ where: { id: req.params.id } })
    return reply.status(204).send()
  })
}
