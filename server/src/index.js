import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { connectDB } from './config/db.js'
import { errorHandler } from './middleware/errorHandler.js'
import claimRoutes from './routes/claims.js'
import policyRoutes from './routes/policies.js'
import dashboardRoutes from './routes/dashboard.js'

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}))

app.use(express.json())

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))
app.use('/api/claims', claimRoutes)
app.use('/api/policies', policyRoutes)
app.use('/api/dashboard', dashboardRoutes)

app.use(errorHandler)

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
})
