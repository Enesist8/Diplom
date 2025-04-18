// models/skill_tag.js
const db = require('../db');

const SkillTag = {
    create: async (tagData) => {
        const { name } = tagData;
        const query = `
            INSERT INTO skill_tags (name)
            VALUES ($1)
            RETURNING *
        `;
        const values = [name];
        const result = await db.query(query, values);
        return result.rows[0];
    },

    getById: async (id) => {
        const query = 'SELECT * FROM skill_tags WHERE skill_tag_id = $1';
        const result = await db.query(query, [id]);
        return result.rows[0];
    },

    getAll: async () => {
        const query = 'SELECT * FROM skill_tags';
        const result = await db.query(query);
        return result.rows;
    },

    update: async (id, tagData) => {
        const { name } = tagData;
        const query = `
            UPDATE skill_tags
            SET name = $1
            WHERE skill_tag_id = $2
            RETURNING *
        `;
        try {
            const result = await db.query(query, [name, id]);
            return result.rows[0];
        } catch (error) {
            console.error("Ошибка при обновлении тега навыка:", error);
            return null;
        }
    },

    delete: async (id) => {
        // Важно: проверьте, используется ли тег, и либо удалите связи, либо запретите удаление
        const query = 'DELETE FROM skill_tags WHERE skill_tag_id = $1 RETURNING *';
        try {
            const result = await db.query(query, [id]);
            return result.rowCount > 0;
        } catch (error) {
            console.error("Ошибка при удалении тега навыка:", error);
            return false;
        }
    },
};

module.exports = SkillTag;