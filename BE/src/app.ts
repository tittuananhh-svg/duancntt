import express from 'express';
import cors, { CorsOptions } from 'cors';
import { registerRoutes } from './routes/index.routes';

const app = express();

const frontendUrl = 'http://localhost:3000';

const corsOptions: CorsOptions = {
    origin: frontendUrl,        // CHỈ chấp nhận từ nguồn gốc này
    credentials: true,          // CHO PHÉP gửi cookie/thông tin xác thực
    optionsSuccessStatus: 200   // Một số trình duyệt cũ (IE11) gặp lỗi với 204
};

// Sử dụng CORS với các tùy chọn đã cấu hình
app.use(cors(corsOptions));
app.use(express.json());


registerRoutes(app);

export default app;