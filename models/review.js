// models/review.js
const db = require('../db');
const { v4: uuidv4 } = require('uuid');

const Review = {
    create: async (reviewData) => {
        const { contract_id, reviewer_id, reviewee_id, rating, comment } = reviewData;
        const review_id = uuidv4();
        const query = `
            INSERT INTO reviews (review_id, contract_id, reviewer_id, reviewee_id, rating, comment)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const values = [review_id, contract_id, reviewer_id, reviewee_id, rating, comment];
        const result = await db.query(query, values);
        return result.rows[0];
    },

    getById: async (id) => {
        const query = 'SELECT * FROM reviews WHERE review_id = $1';
        const result = await db.query(query, [id]);
        return result.rows[0];
    },

    update: async (id, reviewData) => {
        // Логика обновления отзыва может быть ограничена (например, только если еще не прошло определенное время)
        const { rating, comment } = reviewData;
        let updateFields = [];
        let updateValues = [];
        let paramIndex = 1;

        if (rating !== undefined) {
            updateFields.push(`rating = $${paramIndex}`);
            updateValues.push(rating);
            paramIndex++;
        }
        if (comment !== undefined) {
            updateFields.push(`comment = $${paramIndex}`);
            updateValues.push(comment);
            paramIndex++;
        }

        if (updateFields.length === 0) {
            return null;
        }

        updateValues.push(id);
        const updateQuery = `
          UPDATE reviews
          SET ${updateFields.join(', ')}, created_at = NOW()
          WHERE review_id = $${paramIndex}
          RETURNING *
      `;

        try {
            const result = await db.query(updateQuery, updateValues);
            return result.rows[0];
        } catch (error) {
            console.error("Ошибка при обновлении отзыва:", error);
            return null;
        }
    },

    delete: async (id) => {
        // Проверьте права доступа: удалять отзыв может только автор, админ или если он нарушает правила
        const query = 'DELETE FROM reviews WHERE review_id = $1 RETURNING *';
        try {
            const result = await db.query(query, [id]);
            return result.rowCount > 0;
        } catch (error) {
            console.error("Ошибка при удалении отзыва:", error);
            return false;
        }
    },
};

module.exports = Review;