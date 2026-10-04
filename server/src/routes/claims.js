import { Router } from 'express'
import {
  getClaims,
  getClaimById,
  createClaim,
  approveClaim,
  rejectClaim,
  requestClarification,
  overrideClassification,
  getClaimHistory,
} from '../controllers/claimController.js'

const router = Router()

router.get('/', getClaims)
router.post('/', createClaim)
router.get('/:id', getClaimById)
router.post('/:id/approve', approveClaim)
router.post('/:id/reject', rejectClaim)
router.post('/:id/clarification', requestClarification)
router.post('/:id/override', overrideClassification)
router.get('/:id/history', getClaimHistory)

export default router
