import { handle } from 'hono/vercel'
import { createApp } from '../server/app.ts'

export const runtime = 'nodejs'

const app = createApp()

export default handle(app)
