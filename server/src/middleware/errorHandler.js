export function errorHandler(err, req, res, next) {
  console.error(err.stack)

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message)
    return res.status(400).json({ error: 'Validation failed', details: messages })
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid ID format' })
  }

  if (err.code === 11000) {
    return res.status(409).json({ error: 'Duplicate entry' })
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  })
}
