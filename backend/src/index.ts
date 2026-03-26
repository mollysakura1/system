import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import router from './routes/index.js';

const app = express();
const PORT = 3001;

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
      ]
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
