import express from 'express';
import mongoose from 'mongoose';
import pino from 'pino';
import pinoHttp from 'pino-http';

const PORT = process.env.PORT || 3011;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/keephy_flags';
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

mongoose.set('strictQuery', true);
mongoose
  .connect(MONGO_URL, { autoIndex: true })
  .then(() => logger.info({ msg: 'Connected to MongoDB', url: MONGO_URL }))
  .catch((err) => {
    logger.error({ err }, 'MongoDB connection error');
    process.exit(1);
  });

const flagSchema = new mongoose.Schema({ key: String, enabled: Boolean, tenantId: String }, { timestamps: true });
const Flag = mongoose.model('Flag', flagSchema);

const app = express();
app.use(express.json());
app.use(pinoHttp({ logger }));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'feature-flags-service' }));
app.get('/ready', (_req, res) => {
  const state = mongoose.connection.readyState;
  res.status(state === 1 ? 200 : 503).json({ ready: state === 1 });
});

app.get('/flags/:tenantId', async (req, res) => {
  const docs = await Flag.find({ tenantId: req.params.tenantId }).lean();
  const out = {};
  for (const d of docs) out[d.key] = Boolean(d.enabled);
  res.json(out);
});

app.listen(PORT, () => logger.info(`feature-flags-service listening on ${PORT}`));


