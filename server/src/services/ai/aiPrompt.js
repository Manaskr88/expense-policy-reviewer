export function buildSystemInstruction() {
  return `You are an expense claim policy review assistant for a corporate finance team.

Your responsibilities:
- Classify expense claim descriptions into the correct policy category.
- Identify missing information that is required by policy.
- Explain whether a claim complies with policy, needs clarification, or needs review.
- Cite the relevant policy text in your explanation.
- Clearly express uncertainty when the description is ambiguous.

Rules you must follow:
- Only use the policy information provided to you. Never invent policy rules.
- Deterministic validation results provided to you are authoritative. Do not contradict them.
- If you are uncertain about classification, say so and set confidence below 0.6.
- Keep explanations concise and factual. Avoid marketing language.
- You must always return valid JSON matching the required schema.
- Do not include any text outside the JSON block.

Allowed finding values: COMPLIANT, NEEDS_CLARIFICATION, NEEDS_REVIEW, NON_COMPLIANT`
}

export function buildReviewPrompt(claim, policy, validationResults) {
  const policyText = policy
    ? `Category: ${policy.category}
Limit: ₹${policy.limit} ${policy.currency}
Receipt required: ${policy.receiptRequired ? 'Yes' : 'No'}
Business purpose required: ${policy.requiresBusinessPurpose ? 'Yes' : 'No'}
Client information required: ${policy.requiresClientInfo ? 'Yes' : 'No'}
Policy text: ${policy.policyText}`
    : 'No specific policy found for this category.'

  const checksText = validationResults?.checks
    ?.map(c => `  - ${c.name}: ${c.passed ? 'PASS' : 'FAIL'} — ${c.message}`)
    .join('\n') || '  No checks available.'

  return `Review this expense claim against the provided policy.

CLAIM:
  Claimant: ${claim.claimant}
  Date: ${new Date(claim.date).toLocaleDateString('en-IN')}
  Category (submitted): ${claim.category}
  Amount: ₹${claim.amount} ${claim.currency}
  Description: ${claim.description}
  Receipt available: ${claim.receiptAvailable ? 'Yes' : 'No'}

APPLICABLE POLICY:
${policyText}

DETERMINISTIC VALIDATION RESULTS (authoritative):
${checksText}

TASK:
1. Classify the description into the most appropriate policy category. If the submitted category seems correct, confirm it. If it seems wrong or ambiguous, suggest the correct one with your reasoning.
2. Identify any missing information required by policy that is not present in the description.
3. Generate a concise explanation of your finding based on policy evidence.
4. Determine the finding status considering the validation results above.

Return ONLY a JSON object with this exact structure:
{
  "category": "string (one of: Travel, Meals, Accommodation, Client Entertainment, Office Supplies, Communication, Other)",
  "confidence": number between 0 and 1,
  "classificationReason": "string explaining why this category was chosen",
  "missingInformation": ["array of strings listing what policy-required information is missing"],
  "finding": "COMPLIANT | NEEDS_CLARIFICATION | NEEDS_REVIEW | NON_COMPLIANT",
  "explanation": "string — concise explanation of the finding with policy evidence",
  "policyEvidence": "string — the specific policy text that is most relevant to this claim"
}`
}
