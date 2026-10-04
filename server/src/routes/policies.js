import { Router } from 'express'
import { getPolicies } from '../controllers/policyController.js'

const router = Router()

router.get('/', getPolicies)

export default router
