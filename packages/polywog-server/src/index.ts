import express from 'express';
import cors from 'cors';
import { router } from './routes.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(router);

const PORT = Number(process.env['PORT']) || 3100;

app.listen(PORT, () => {
  console.log(`Polywog Server v1.0.0 listening on http://localhost:${PORT}`);
});
