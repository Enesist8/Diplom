// models/category.js
const db = require('../db');

const Category = {
    create: async (categoryData) => {
        const { name, description, parent_category_id } = categoryData;
        const query = `
            INSERT INTO categories (name, description, parent_category_id)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        const values = [name, description, parent_category_id];
        const result = await db.query(query, values);
        return result.rows[0];
    },

    getById: async (id) => {
        const query = 'SELECT * FROM categories WHERE category_id = $1';
        const result = await db.query(query, [id]);
        return result.rows[0];
    },

    getAll: async () => {
        const query = 'SELECT * FROM categories';
        const result = await db.query(query);
        return result.rows;
    },

    update: async (id, categoryData) => {
        const { name, description, parent_category_id } = categoryData;
        let updateFields = [];
        let updateValues = [];
        let paramIndex = 1;

        if (name !== undefined) {
            updateFields.push(`name = $${paramIndex}`);
            updateValues.push(name);
            paramIndex++;
        }
        if (description !== undefined) {
            updateFields.push(`description = $${paramIndex}`);
            updateValues.push(description);
            paramIndex++;
        }
        if (parent_category_id !== undefined) {
            updateFields.push(`parent_category_id = $${paramIndex}`);
            updateValues.push(parent_category_id);
            paramIndex++;
        }

        if (updateFields.length === 0) {
            return null; // Ничего не обновлять
        }

        updateValues.push(id);
        const updateQuery = `
            UPDATE categories
            SET ${updateFields.join(', ')}
            WHERE category_id = $${paramIndex}
            RETURNING *
        `;

        try {
            const result = await db.query(updateQuery, updateValues);
            return result.rows[0];
        } catch (error) {
            console.error("Ошибка при обновлении категории:", error);
            return null;
        }
    },

    delete: async (id) => {
        // Важно: проверьте, есть ли дочерние категории, и либо удалите их, либо переместите в другую категорию
        const query = 'DELETE FROM categories WHERE category_id = $1 RETURNING *';
        try {
            const result = await db.query(query, [id]);
            return result.rowCount > 0;
        } catch (error) {
            console.error("Ошибка при удалении категории:", error);
            return false;
        }
    },
};

module.exports = Category;