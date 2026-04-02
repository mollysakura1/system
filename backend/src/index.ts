import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import router from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envCandidates = [
  path.resolve(process.cwd(), 'backend/.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../.env')
];

for (const envPath of envCandidates) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/', (_, res) => {
  res.json({
    code: 0,
    message: 'AI 智能运营管理平台后端服务运行中',
    data: {
      health: 'ok',
      apiBase: '/api',
      docs: [
        '/api/auth/login',
        '/api/user/profile',
        '/api/menus',
        '/api/dashboard/overview',
        '/api/ai/stream'
      ],
      envLoaded: Boolean(process.env.ALIYUN_API_KEY)
    }
  });
});

app.use('/api', router);

app.use((_, res) => {
  res.status(404).json({ code: 404, message: 'Not Found', data: null });
});

app.listen(PORT, () => {
  console.log(`backend server running at http://localhost:${PORT}`);
});
