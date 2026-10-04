import { Router } from 'express'
import { getDashboardStats } from '../controllers/dashboardController.js'
import { getAllHistory } from '../controllers/claimController.js'

const router = Router()

router.get('/stats', getDashboardStats)
router.get('/history', getAllHistory)

export default router
