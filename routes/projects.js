const express = require('express');
const router = express.Router();
const Project = require('../models/project');
const auth = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const { isValidUUID } = require('../utils/isValidUUID');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const File = require('../models/file'); // Добавьте этот импорт




// 1. Сначала определите fileFilter
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'application/zip',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true); // Принимаем файл
    } else {
        cb(new Error('Недопустимый тип файла. Разрешены: PDF, JPEG, PNG, ZIP, DOC'), false);
    }
};
// Настройка хранилища для файлов
// Configure storage
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/projects');
        await fs.ensureDir(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, uniqueSuffix + '_' + safeName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
        files: 10 // Max 10 files
    }
});
// Валидаторы
const projectValidators = [
    body('title').trim().isLength({ min: 5, max: 100 }).withMessage('Название должно быть от 5 до 100 символов'),
    body('description').trim().isLength({ min: 20, max: 2000 }).withMessage('Описание должно быть от 20 до 2000 символов'),
    body('budget').isFloat({ min: 1 }).withMessage('Бюджет должен быть числом больше 0'),
    body('deadline').isISO8601().withMessage('Неверный формат даты'),
    body('skills_required').optional().isArray().withMessage('Навыки должны быть массивом'),
    body('category_id').isInt({ min: 1 }).withMessage('Неверный ID категории')
];

// Создание проекта
router.post('/', auth('client'), projectValidators, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, budget, deadline, skills_required, category_id } = req.body;
    const client_id = req.session.userId;

    try {
        const projectData = {
            client_id,
            category_id,
            title,
            description,
            budget,
            deadline: new Date(deadline),
            skills_required: skills_required || []
        };

        const newProject = await Project.create(projectData);
        res.status(201).json(newProject);
    } catch (error) {
        console.error('Ошибка создания проекта:', error);
        res.status(500).json({
            error: 'Не удалось создать проект',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Получение проектов с фильтрацией
router.get('/', async (req, res) => {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    try {
        let projects;
        if (status) {
            projects = await Project.getByStatus(status, limit, offset);
        } else {
            projects = await Project.getAll(limit, offset);
        }

        res.json({
            data: projects,
            meta: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: await Project.getCount(status)
            }
        });
    } catch (error) {
        console.error('Ошибка получения проектов:', error);
        res.status(500).json({ error: 'Не удалось получить проекты' });
    }
});

// Получение проектов клиента
router.get('/my-projects', auth('client'), async (req, res) => {
    const client_id = req.session.userId;

    if (!isValidUUID(client_id)) {
        return res.status(400).json({ message: 'Неверный ID клиента' });
    }

    try {
        const projects = await Project.getByClientId(client_id);
        res.json(projects);
    } catch (error) {
        console.error('Ошибка получения проектов клиента:', error);
        res.status(500).json({ error: 'Не удалось получить проекты' });
    }
});

router.get('/freelancer-projects', auth('freelancer'), async (req, res) => {
    try {
        const projects = await Project.getFreelancerProjects(req.session.userId);
        res.json(projects);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            error: 'Не удалось загрузить проекты',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

router.get('/:project_id', auth(['client', 'freelancer']), async (req, res) => {
    const { project_id } = req.params;

    console.log('Запрос проекта ID:', project_id); // Логируем ID

    try {
        const project = await Project.getById(project_id);
        console.log('Данные проекта:', project); // Логируем полученные данные

        res.json(project);
    } catch (error) {
        console.error('Ошибка получения проекта:', error); // Логируем ошибку
        res.status(500).json({
            error: 'Ошибка сервера',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Взятие проекта фрилансером
router.post('/:project_id/take', auth('freelancer'), async (req, res) => {
    const { project_id } = req.params;
    const freelancer_id = req.session.userId;

    if (!isValidUUID(project_id)) {
        return res.status(400).json({ message: 'Неверный ID проекта' });
    }

    try {
        // Проверка что проект доступен
        const project = await Project.getById(project_id);
        if (project.status !== 'open') {
            return res.status(400).json({ message: 'Проект уже занят' });
        }

        const updatedProject = await Project.takeProject(project_id, freelancer_id);
        res.json({
            message: 'Проект успешно взят',
            project: updatedProject
        });
    } catch (error) {
        console.error('Ошибка взятия проекта:', error);
        res.status(400).json({
            error: error.message || 'Не удалось взять проект'
        });
    }
});

// Доставка проекта
router.post('/:project_id/deliver',
    auth('freelancer'),
    upload.array('files'),
    async (req, res) => {
        try {
            const { project_id } = req.params;
            const { message } = req.body;
            const files = req.files || [];
            const freelancer_id = req.session.userId;

            // Validate project
            const project = await Project.getById(project_id);
            if (!project) {
                throw new Error('Project not found');
            }

            if (project.freelancer_id !== freelancer_id) {
                throw new Error('You are not assigned to this project');
            }

            // Save file info
            const fileRecords = await Promise.all(
                files.map(file => File.create({
                    project_id,
                    filename: file.filename,
                    originalname: file.originalname,
                    path: file.path,
                    size: file.size,
                    mimetype: file.mimetype
                }))
            );

            // Update project status
            const updatedProject = await Project.deliverProject(project_id);

            res.json({
                success: true,
                message: 'Project delivered successfully',
                files: fileRecords.map(file => ({
                    id: file.file_id,
                    name: file.originalname,
                    size: file.size,
                    url: `/uploads/projects/${file.filename}`
                })),
                project: updatedProject
            });

        } catch (error) {
            // Clean up uploaded files on error
            if (req.files) {
                await Promise.all(req.files.map(file =>
                    fs.unlink(file.path).catch(console.error)
                ));
            }
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

router.patch('/:project_id/status', auth('freelancer'), async (req, res) => {
    const { project_id } = req.params;
    const { status, freelancer_id } = req.body;

    try {
        const project = await Project.getById(project_id);

        // Проверяем, что проект существует
        if (!project) {
            return res.status(404).json({ message: 'Проект не найден' });
        }

        // Обновляем статус и фрилансера
        const updatedProject = await Project.updateStatusAndFreelancer(
            project_id,
            status,
            freelancer_id
        );

        res.json(updatedProject);
    } catch (error) {
        console.error('Ошибка обновления статуса:', error);
        res.status(500).json({ error: 'Не удалось обновить статус проекта' });
    }
});

router.get('/:project_id/files', auth(['client', 'freelancer']), async (req, res) => {
    try {
        const { project_id } = req.params;

        // Проверка прав доступа
        const project = await Project.getById(project_id);
        if (!project) throw new Error('Проект не найден');

        const hasAccess = (project.client_id === req.session.userId ||
            project.freelancer_id === req.session.userId);
        if (!hasAccess) throw new Error('Нет доступа к файлам проекта');

        // Получаем файлы из БД
        const files = await File.getByProject(project_id);

        if (!files || files.length === 0) {
            return res.status(404).json({ error: 'Файлы не найдены' });
        }

        // Формируем правильный ответ
        const responseFiles = files.map(file => ({
            id: file.file_id,
            name: file.originalname || file.filename,
            size: file.size,
            url: `/uploads/projects/${encodeURIComponent(file.filename)}`,
            type: file.mimetype
        }));

        res.json(responseFiles);

    } catch (error) {
        console.error('Ошибка получения файлов:', error);
        res.status(500).json({
            error: error.message || 'Ошибка сервера',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

module.exports = router;