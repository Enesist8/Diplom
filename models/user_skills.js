// models/user_skills.js
const db = require('../db');

const UserSkill = {
    create: async (user_id, skill_tag_id) => {
        const query = `
            INSERT INTO user_skills (user_id, skill_tag_id)
            VALUES ($1, $2)
            RETURNING *
        `;
        try {
            const result = await db.query(query, [user_id, skill_tag_id]);
            return result.rows[0];
        } catch (error) {
            console.error("Ошибка при добавлении навыка пользователю:", error);
            return null;
        }
    },

    getByUserId: async (userId) => {
        const query = 'SELECT * FROM user_skills WHERE user_id = $1';
        const result = await db.query(query, [userId]);
        return result.rows;
    },

    delete: async (user_id, skill_tag_id) => {
        const query = 'DELETE FROM user_skills WHERE user_id = $1 AND skill_tag_id = $2 RETURNING *';
        try {
            const result = await db.query(query, [user_id, skill_tag_id]);
            return result.rowCount > 0;
        } catch (error) {
            console.error("Ошибка при удалении навыка у пользователя:", error);
            return false;
        }
    },

    deleteByUserId: async (userId) => {
        const query = 'DELETE FROM user_skills WHERE user_id = $1 RETURNING *';
        try {
            const result = await db.query(query, [userId]);
            return result.rowCount > 0;
        } catch (error) {
            console.error("Ошибка при удалении навыков у пользователя:", error);
            return false;
        }
    }
};

module.exports = UserSkill;