const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const { isValidDate, isValidUUID } = require('../utils/validators');

const Project = {
    create: async (projectData) => {
        const { client_id, category_id, title, description, budget, deadline, skills_required } = projectData;

        // Валидация
        if (!isValidUUID(client_id)) {
            throw new Error('Неверный формат ID клиента');
        }

        if (typeof budget !== 'number' || budget <= 0) {
            throw new Error('Бюджет должен быть положительным числом');
        }

        if (!isValidDate(deadline)) {
            throw new Error('Неверный формат даты');
        }

        const project_id = uuidv4();
        const query = `
            INSERT INTO projects (
                project_id, client_id, category_id,
                title, description, budget,
                deadline, skills_required, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open')
                RETURNING *
        `;

        const values = [
            project_id,
            client_id,
            category_id,
            title,
            description,
            budget,
            new Date(deadline),
            skills_required || []
        ];

        try {
            const result = await db.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error("Ошибка создания проекта:", error);
            throw new Error('Не удалось создать проект');
        }
    },

    getByClientId: async (client_id) => {
        if (!isValidUUID(client_id)) {
            throw new Error('Неверный ID клиента');
        }

        const query = `
            SELECT * FROM projects
            WHERE client_id = $1
            ORDER BY created_at DESC
        `;

        try {
            const result = await db.query(query, [client_id]);
            return result.rows;
        } catch (error) {
            console.error("Ошибка получения проектов клиента:", error);
            throw new Error('Не удалось получить проекты');
        }
    },

    getAll: async (limit = 10, offset = 0) => {
        const query = `
            SELECT * FROM projects 
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
        `;

        try {
            const result = await db.query(query, [limit, offset]);
            return result.rows;
        } catch (error) {
            console.error("Ошибка получения проектов:", error);
            throw new Error('Не удалось получить проекты');
        }
    },

    getByStatus: async (status, limit = 10, offset = 0) => {
        const validStatuses = ['open', 'in_progress', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            throw new Error('Неверный статус проекта');
        }

        const query = `
            SELECT * FROM projects
            WHERE status = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `;

        try {
            const result = await db.query(query, [status, limit, offset]);
            return result.rows;
        } catch (error) {
            console.error("Ошибка получения проектов по статусу:", error);
            throw new Error('Не удалось получить проекты');
        }
    },

    getCount: async (status = null) => {
        let query = 'SELECT COUNT(*) FROM projects';
        let values = [];

        if (status) {
            query += ' WHERE status = $1';
            values.push(status);
        }

        try {
            const result = await db.query(query, values);
            return parseInt(result.rows[0].count);
        } catch (error) {
            console.error("Ошибка подсчета проектов:", error);
            throw new Error('Не удалось подсчитать проекты');
        }
    },

    getById: async (project_id) => {
        const query = `
            SELECT
                p.*,
                u.first_name as client_first_name,
                u.last_name as client_last_name,
                u.email as client_email,
                f.first_name as freelancer_first_name,
                f.last_name as freelancer_last_name,
                f.email as freelancer_email
            FROM projects p
                     JOIN users u ON p.client_id = u.user_id
                     LEFT JOIN users f ON p.freelancer_id = f.user_id
            WHERE p.project_id = $1
        `;

        console.log('Выполняем запрос для проекта ID:', project_id); // Логирование

        try {
            const result = await db.query(query, [project_id]);
            return result.rows[0];
        } catch (error) {
            console.error('Ошибка SQL запроса:', error); // Логирование ошибки SQL
            throw error;
        }
    },

    takeProject: async (project_id, freelancer_id) => {
        if (!isValidUUID(project_id) || !isValidUUID(freelancer_id)) {
            throw new Error('Неверный ID проекта или фрилансера');
        }

        const query = `
            UPDATE projects 
            SET 
                status = 'in_progress', 
                freelancer_id = $1,
                updated_at = NOW()
            WHERE project_id = $2
            AND status = 'open'
            RETURNING *
        `;

        try {
            const result = await db.query(query, [freelancer_id, project_id]);
            if (result.rows.length === 0) {
                throw new Error('Проект недоступен или уже взят');
            }
            return result.rows[0];
        } catch (error) {
            console.error("Ошибка взятия проекта:", error);
            throw error;
        }
    },

    deliverProject: async (project_id) => {
        if (!isValidUUID(project_id)) {
            throw new Error('Неверный ID проекта');
        }

        // Сначала получаем текущее состояние проекта
        const project = await Project.getById(project_id);

        // Проверки перед обновлением
        if (!project.freelancer_id) {
            throw new Error('Нельзя завершить проект без назначенного фрилансера');
        }

        if (project.status !== 'in_progress') {
            throw new Error('Можно завершать только проекты в статусе "В работе"');
        }

        const query = `
        UPDATE projects 
        SET 
            status = 'completed',
            completed_at = NOW(),
            updated_at = NOW()
        WHERE project_id = $1
        AND status = 'in_progress'
        RETURNING *
    `;

        try {
            const result = await db.query(query, [project_id]);
            if (result.rows.length === 0) {
                throw new Error('Проект не в работе или не найден');
            }
            return result.rows[0];
        } catch (error) {
            console.error("Ошибка сдачи проекта:", error);
            throw error;
        }
    },

    getFreelancerProjects: async (freelancer_id) => {
        const query = `
            SELECT
                p.*,
                u.first_name as client_first_name,
                u.last_name as client_last_name
            FROM projects p
                     JOIN users u ON p.client_id = u.user_id
            WHERE p.freelancer_id = $1
            ORDER BY p.created_at DESC
        `;

        try {
            const result = await db.query(query, [freelancer_id]);
            return result.rows;
        } catch (error) {
            console.error("Database error:", error);
            throw new Error('Ошибка при получении проектов из базы данных');
        }
    },

    search: async (query, limit = 10, offset = 0) => {
        const searchQuery = `
            SELECT * FROM projects
            WHERE 
                title ILIKE $1 OR
                description ILIKE $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `;

        try {
            const result = await db.query(searchQuery, [`%${query}%`, limit, offset]);
            return result.rows;
        } catch (error) {
            console.error("Ошибка поиска проектов:", error);
            throw new Error('Не удалось выполнить поиск');
        }
    },

    updateStatusAndFreelancer: async (projectId, status, freelancerId) => {
        const query = `
        UPDATE projects 
        SET status = $1, freelancer_id = $2, updated_at = NOW() 
        WHERE project_id = $3 
        RETURNING *
    `;
        const result = await db.query(query, [status, freelancerId, projectId]);
        return result.rows[0];
    }
};

module.exports = Project;