import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { testConnection } from './config/db.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';

// Rutas
import productosRoutes from './routes/productos.routes.js';
import categoriasRoutes from './routes/categorias.routes.js';
import marcasRoutes from './routes/marcas.routes.js';
import clientesRoutes from './routes/clientes.routes.js';
import proveedoresRoutes from './routes/proveedores.routes.js';
import comprasRoutes from './routes/compras.routes.js';
import ventasRoutes from './routes/ventas.routes.js';
import gastosRoutes from './routes/gastos.routes.js';
import reportesRoutes from './routes/reportes.routes.js';
import authRoutes from './routes/auth.routes.js';



const app = express();

app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, env: config.env, ts: new Date().toISOString() });
});

// Rutas de la API
app.use('/api/productos', productosRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/marcas', marcasRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/proveedores', proveedoresRoutes);
app.use('/api/compras', comprasRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/gastos', gastosRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/auth', authRoutes);



app.use(notFound);
app.use(errorHandler);

(async () => {
  try {
    await testConnection();
    app.listen(config.port, () => {
      console.log(`\n🚀 Servidor en http://localhost:${config.port}`);
      console.log(`   Entorno: ${config.env}`);
      console.log(`   Health:  http://localhost:${config.port}/api/health\n`);
    });
  } catch (err) {
    console.error('💥 Error arrancando el servidor:', err);
    process.exit(1);
  }
})();