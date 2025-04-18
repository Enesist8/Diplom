// app.js
const express = require('express');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');
const cors = require('cors'); // Добавляем cors
const db = require('./db');
const auth = require('./middleware/auth');
const { initializeSocket } = require('./socket');
const path = require('path');
const router = express.Router();


// Import Routes
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const proposalRoutes = require('./routes/proposals');
const contractRoutes = require('./routes/contracts');
const messageRoutes = require('./routes/messages');
const categoryRoutes = require('./routes/categories');
const reviewRoutes = require('./routes/reviews');
const portfolioItemRoutes = require('./routes/portfolio_items');
const skillTagRoutes = require('./routes/skill_tags');
const userSkillRoutes = require('./routes/user_skills');
const projectSkillRoutes = require('./routes/project_skills');
const paymentRoutes = require('./routes/payments');

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// CORS Configuration
const corsOptions = {
    origin: ['http://local.myapp.com:8080', 'http://127.0.0.1:8080', 'http://192.168.0.18:8080'],
    credentials: true, // Разрешает отправку cookies
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'X-Requested-With', 'X-Request-ID', 'x-csrf-token'], // Разрешаем заголовок Authorization
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // Разрешенные методы
    exposedHeaders: ['Content-Length', 'X-Request-ID'] // Дополнительные заголовки для клиента

};
app.use(cors(corsOptions));

app.use(session({
    secret: process.env.SESSION_SECRET || "H+g%D9W~Z='arG&w3U[$c.VuFE:<pkYyhfS",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // false для development, true для production
        httpOnly: true,
        domain: 'local.myapp.com',
        maxAge: 1000 * 60 * 60 * 24, // 24 часа
        sameSite: 'lax' // Защита от CSRF
    }
}));

// 2. Настройки для обработки больших файлов (добавьте эти строки)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// Middleware для обработки JSON-данных
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



const server = app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

initializeSocket(server);


// Connect Routes
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/portfolio_items', portfolioItemRoutes);
app.use('/api/skill_tags', skillTagRoutes);
app.use('/api/user_skills', userSkillRoutes);
app.use('/api/project_skills', projectSkillRoutes);
app.use('/api/payments', paymentRoutes);
app.get('/freelancer', auth('freelancer'), (req, res) => {
    res.sendFile(__dirname + '/freelancer.html'); // Укажите путь к вашему freelancer.html файлу
});
app.get('/api/current-user', (req, res) => {
    const userId = req.session.userId; // userId из сессии
    const userType = req.session.userType; // userType из сессии (если нужно)

    if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
    }

    res.json({
        userId: userId,
        userType: userType // Опционально, если нужно
    });
});
app.patch('/api/projects/:id/assign', auth(), async (req, res) => {
    try {
        const { freelancer_id } = req.body;

        // 1. Находим проект
        const project = await Project.findByPk(req.params.id);
        if (!project) return res.status(404).json({ error: 'Проект не найден' });

        // 2. Находим фрилансера
        const freelancer = await User.findByPk(freelancer_id);
        if (!freelancer) return res.status(400).json({ error: 'Фрилансер не найден' });

        // 3. Проверяем, что пользователь является клиентом проекта
        if (project.client_id !== req.user.id) {
            return res.status(403).json({ error: 'Недостаточно прав для выполнения операции' });
        }

        // 4. Обновляем проект
        await project.update({
            freelancer_id,
            status: 'in_progress',
            freelancer: { // Сохраняем основные данные
                id: freelancer.id,
                name: `${freelancer.first_name} ${freelancer.last_name}`,
                email: freelancer.email
            }
        });

        // 5. Создаем контракт
        const contract = await db.Contract.create({
            project_id: project.id,
            client_id: project.client_id,
            freelancer_id: freelancer.id,
            agreed_price: project.budget,
            status: 'active',
            start_date: new Date()
        });

        res.json({
            project,
            contract
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера', details: error.message });
    }
});

app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'payment-service',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        dbStatus: 'connected' // Можно добавить проверку подключения к БД
    });
});

app.use((req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.url}`);
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    next();
});

// Логирование всех исходящих ответов
app.use((req, res, next) => {
    const originalSend = res.send;
    res.send = function (body) {
        console.log(`Outgoing response: ${res.statusCode}`);
        console.log('Response body:', body);
        originalSend.call(this, body);
    };
    next();
});

// Разрешаем доступ к загруженным файлам
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    maxAge: '1y',
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            res.setHeader('Content-Disposition', 'attachment');
        }
    }
}));

app.use('/uploads/projects', express.static(path.join(__dirname, 'uploads', 'projects'), {
    setHeaders: (res, filePath) => {
        // Устанавливаем правильные заголовки для скачивания
        const filename = path.basename(filePath);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    }
}));
app.use((req, res, next) => {
    console.log('🌐 GLOBAL LOGGER →', req.method, req.url);
    next();
});
app.post('/api/payments', (req, res) => {
    console.log('🔥 ПРЯМОЙ POST /api/payments сработал!');
    res.json({ test: true });
});
// Error Handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

