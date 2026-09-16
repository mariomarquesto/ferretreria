export const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err.message);

  if (err.code === '23505') {
    return res.status(409).json({ error: 'Registro duplicado', detalle: err.detail });
  }
  if (err.code === '23503') {
    return res.status(409).json({ error: 'Referencia inexistente', detalle: err.detail });
  }
  if (err.code === '42P10') {
    return res.status(400).json({ error: 'ON CONFLICT inválido', detalle: err.message });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor'
  });
};

export const notFound = (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada', path: req.originalUrl });
};

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);