// models/portfolio_item.js
const db = require('../db');
const { v4: uuidv4 } = require('uuid');

const PortfolioItem = {
    create: async (itemData) => {
        const { user_id, title, description, image_url, project_url } = itemData;
        const portfolio_item_id = uuidv4();
        const query = `
            INSERT INTO portfolio_items (portfolio_item_id, user_id, title, description, image_url, project_url)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const values = [portfolio_item_id, user_id, title, description, image_url, project_url];
        const result = await db.query(query, values);
        return result.rows[0];
    },

    getById: async (id) => {
        const query = 'SELECT * FROM portfolio_items WHERE portfolio_item_id = $1';
        const result = await db.query(query, [id]);
        return result.rows[0];
    },

    update: async (id, itemData) => {
        const { title, description, image_url, project_url } = itemData;
        let updateFields = [];
        let updateValues = [];
        let paramIndex = 1;

        if (title !== undefined) {
            updateFields.push(`title = $${paramIndex}`);
            updateValues.push(title);
            paramIndex++;
        }
        if (description !== undefined) {
            updateFields.push(`description = $${paramIndex}`);
            updateValues.push(description);
            paramIndex++;
        }
        if (image_url !== undefined) {
            updateFields.push(`image_url = $${paramIndex}`);
            updateValues.push(image_url);
            paramIndex++;
        }
        if (project_url !== undefined) {
            updateFields.push(`project_url = $${paramIndex}`);
            updateValues.push(project_url);
            paramIndex++;
        }

        if (updateFields.length === 0) {
            return null;
        }

        updateValues.push(id);
        const updateQuery = `
            UPDATE portfolio_items
            SET ${updateFields.join(', ')}
            WHERE portfolio_item_id = $${paramIndex}
            RETURNING *
        `;

        try {
            const result = await db.query(updateQuery, updateValues);
            return result.rows[0];
        } catch (error) {
            console.error("Ошибка при обновлении элемента портфолио:", error);
            return null;
        }
    },

    delete: async (id) => {
        // Проверьте права доступа: удалять элемент может только владелец
        const query = 'DELETE FROM portfolio_items WHERE portfolio_item_id = $1 RETURNING *';
        try {
            const result = await db.query(query, [id]);
            return result.rowCount > 0;
        } catch (error) {
            console.error("Ошибка при удалении элемента портфолио:", error);
            return false;
        }
    },
};

module.exports = PortfolioItem;