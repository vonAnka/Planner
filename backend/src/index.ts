import Fastify from 'fastify'
import cors from '@fastify/cors'
import staticPlugin from '@fastify/static'
import path from 'path'
import projectRoutes from './routes/projects'
import memberRoutes from './routes/members'
import taskRoutes from './routes/tasks'
import dependencyRoutes from './routes/dependencies'
import gateRoutes from './routes/gates'

const server = Fastify({ logger: true })

async function main() {
  await server.register(cors, {
    origin: process.env.CORS_ORIGIN ?? '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  })

  // Resolve relative to compiled output (dist/index.js) → project root → frontend/dist
  const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist')

  await server.register(staticPlugin, {
    root: frontendDist,
    prefix: '/',
  })

  server.setNotFoundHandler((_req, reply) => {
    reply.sendFile('index.html')
  })

  await server.register(projectRoutes, { prefix: '/api' })
  await server.register(memberRoutes, { prefix: '/api' })
  await server.register(taskRoutes, { prefix: '/api' })
  await server.register(dependencyRoutes, { prefix: '/api' })
  await server.register(gateRoutes, { prefix: '/api' })

  server.get('/health', async () => ({ status: 'ok' }))

  const port = parseInt(process.env.PORT ?? '3001')
  await server.listen({ port, host: '0.0.0.0' })
  console.log(`Server running on http://localhost:${port}`)
}

main().catch((err) => {
  server.log.error(err)
  process.exit(1)
})
