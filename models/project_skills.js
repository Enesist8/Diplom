// models/project_skills.js
const db = require('../db');

const ProjectSkill = {
    create: async (project_id, skill_tag_id) => {
        const query = `
            INSERT INTO project_skills (project_id, skill_tag_id)
            VALUES ($1, $2)
            RETURNING *
        `;
        try {
            const result = await db.query(query, [project_id, skill_tag_id]);
            return result.rows[0];
        } catch (error) {
            console.error("Ошибка при добавлении навыка проекту:", error);
            return null;
        }
    },

    getByProjectId: async (projectId) => {
        const query = 'SELECT * FROM project_skills WHERE project_id = $1';
        const result = await db.query(query, [projectId]);
        return result.rows;
    },

    delete: async (project_id, skill_tag_id) => {
        const query = 'DELETE FROM project_skills WHERE project_id = $1 AND skill_tag_id = $2 RETURNING *';
        try {
            const result = await db.query(query, [project_id, skill_tag_id]);
            return result.rowCount > 0;
        } catch (error) {
            console.error("Ошибка при удалении навыка у проекта:", error);
            return false;
        }
    },
    deleteByProjectId: async (projectId) => {
        const query = 'DELETE FROM project_skills WHERE project_id = $1 RETURNING *';
        try {
            const result = await db.query(query, [projectId]);
            return result.rowCount > 0;
        } catch (error) {
            console.error("Ошибка при удалении всех навыков у проекта:", error);
            return false;
        }
    }
};

module.exports = ProjectSkill;