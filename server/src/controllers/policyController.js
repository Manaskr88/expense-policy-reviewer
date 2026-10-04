import { getAllPolicies } from '../services/policy/policyService.js'

export async function getPolicies(req, res) {
  try {
    const policies = await getAllPolicies()
    res.json(policies)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch policies' })
  }
}
