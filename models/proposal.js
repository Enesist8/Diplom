// models/proposal.js
const db = require('../db');
const { v4: uuidv4 } = require('uuid');

const Proposal = {
    create: async (proposalData) => {
        const { project_id, freelancer_id, cover_letter, proposed_price, estimated_completion_days } = proposalData;
        const proposal_id = uuidv4();
        const query = `
            INSERT INTO proposals (proposal_id, project_id, freelancer_id, cover_letter, proposed_price, estimated_completion_days)
            VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
        `;
        const values = [proposal_id, project_id, freelancer_id, cover_letter, proposed_price, estimated_completion_days];
        const result = await db.query(query, values);
        return result.rows[0];
    },

    getById: async (id) => {
        const query = 'SELECT * FROM proposals WHERE proposal_id = $1';
        const result = await db.query(query, [id]);
        return result.rows[0];
    },

    getAllForProject: async (projectId) => {
        const query = 'SELECT * FROM proposals WHERE project_id = $1';
        const result = await db.query(query, [projectId]);
        return result.rows;
    },

    update: async (id, proposalData) => {
        // Реализуй логику обновления предложения.
        // Проверь права доступа (например, только фрилансер, создавший предложение, может его обновить).
        const { cover_letter, proposed_price, estimated_completion_days, status } = proposalData;
        let updateFields = [];
        let updateValues = [];
        let paramIndex = 1;

        if (cover_letter !== undefined) {
            updateFields.push(`cover_letter = $${paramIndex}`);
            updateValues.push(cover_letter);
            paramIndex++;
        }
        if (proposed_price !== undefined) {
            updateFields.push(`proposed_price = $${paramIndex}`);
            updateValues.push(proposed_price);
            paramIndex++;
        }
        if (estimated_completion_days !== undefined) {
            updateFields.push(`estimated_completion_days = $${paramIndex}`);
            updateValues.push(estimated_completion_days);
            paramIndex++;
        }
        if (status !== undefined) {
            updateFields.push(`status = $${paramIndex}`);
            updateValues.push(status);
            paramIndex++;
        }

        if (updateFields.length === 0) {
            return null; // Ничего не обновлять
        }
        updateValues.push(id);
        const updateQuery = `
            UPDATE proposals
            SET ${updateFields.join(', ')}, updated_at = NOW()
            WHERE proposal_id = $${paramIndex}
            RETURNING *
        `;
        try {
            const result = await db.query(updateQuery, updateValues);
            return result.rows[0];
        } catch (error) {
            console.error("Ошибка при обновлении предложения:", error);
            return null;
        }
    },

    delete: async (id) => {
        // Реализуй логику удаления предложения.
        // Проверь права доступа (например, только фрилансер, создавший предложение, может его удалить).
        const query = 'DELETE FROM proposals WHERE proposal_id = $1 RETURNING *';
        try {
            const result = await db.query(query, [id]);
            return result.rowCount > 0; // Вернем true, если предложение было удалено
        } catch (error) {
            console.error("Ошибка при удалении предложения:", error);
            return false;
        }
    },
};

module.exports = Proposal;