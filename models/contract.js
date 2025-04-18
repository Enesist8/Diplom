// models/contract.js
const db = require('../db');
const { v4: uuidv4 } = require('uuid');

const Contract = {
    create: async (contractData) => {
        console.log('Creating contract with data:', contractData); // Логирование данных контракта

        const { project_id, proposal_id, client_id, freelancer_id, start_date, end_date, agreed_price, terms_and_conditions, status } = contractData;

        // Генерация уникального ID для контракта
        const contract_id = uuidv4();

        // SQL-запрос для вставки данных
        const query = `
            INSERT INTO contracts (
                contract_id,
                project_id,
                proposal_id,
                client_id,
                freelancer_id,
                start_date,
                end_date,
                agreed_price,
                terms_and_conditions,
                status,
                updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
                RETURNING *
        `;

        // Значения для SQL-запроса
        const values = [
            contract_id,
            project_id,
            proposal_id,
            client_id,
            freelancer_id,
            start_date,
            end_date,
            agreed_price,
            terms_and_conditions,
            status || 'active' // По умолчанию статус 'active', если не указан
        ];

        console.log('Executing query:', query); // Логирование SQL-запроса
        console.log('Query values:', values); // Логирование значений для SQL-запроса

        try {
            // Выполнение запроса
            const result = await db.query(query, values);

            // Логирование результата
            console.log('Query result:', result.rows[0]);

            // Возвращаем созданный контракт
            return result.rows[0];
        } catch (error) {
            // Логирование ошибки
            console.error('Error executing query:', error);

            // Если ошибка связана с нарушением ограничений базы данных, выбрасываем соответствующее сообщение
            if (error.code === '23505') { // Код ошибки "unique_violation" в PostgreSQL
                throw new Error('Contract with the same ID already exists');
            } else if (error.code === '23503') { // Код ошибки "foreign_key_violation" в PostgreSQL
                throw new Error('Invalid project_id, client_id, or freelancer_id');
            } else {
                throw new Error('Failed to create contract');
            }
        }
    },




    getById: async (id) => {
        const query = 'SELECT * FROM contracts WHERE contract_id = $1';
        const result = await db.query(query, [id]);
        return result.rows[0];
    },

    getByProjectId: async (projectId) => {
        const query = 'SELECT * FROM contracts WHERE project_id = $1';
        const result = await db.query(query, [projectId]);
        return result.rows;
    },

    update: async (id, contractData) => {
        // Реализуй логику обновления контракта.
        // Проверь права доступа (например, только клиент или фрилансер, участвующие в контракте, могут его обновить).
        const { start_date, end_date, agreed_price, terms_and_conditions, status } = contractData;
        let updateFields = [];
        let updateValues = [];
        let paramIndex = 1;
        if (start_date !== undefined) {
            updateFields.push(`start_date = $${paramIndex}`);
            updateValues.push(start_date);
            paramIndex++;
        }
        if (end_date !== undefined) {
            updateFields.push(`end_date = $${paramIndex}`);
            updateValues.push(end_date);
            paramIndex++;
        }
        if (agreed_price !== undefined) {
            updateFields.push(`agreed_price = $${paramIndex}`);
            updateValues.push(agreed_price);
            paramIndex++;
        }
        if (terms_and_conditions !== undefined) {
            updateFields.push(`terms_and_conditions = $${paramIndex}`);
            updateValues.push(terms_and_conditions);
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
          UPDATE contracts
          SET ${updateFields.join(', ')}, updated_at = NOW()
          WHERE contract_id = $${paramIndex}
          RETURNING *
      `;
        try {
            const result = await db.query(updateQuery, updateValues);
            return result.rows[0];
        } catch (error) {
            console.error("Ошибка при обновлении контракта:", error);
            return null;
        }
    },

    delete: async (id) => {
        // Удаление контракта может быть ограничено (например, только если контракт еще не начался).
        // Может потребоваться отмена связанных платежей.
        const query = 'DELETE FROM contracts WHERE contract_id = $1 RETURNING *';
        try {
            const result = await db.query(query, [id]);
            return result.rowCount > 0;
        } catch (error) {
            console.error("Ошибка при удалении контракта:", error);
            return false;
        }
    },

    getByClientId: async (clientId) => {
        const query = 'SELECT * FROM contracts WHERE client_id = $1';
        const result = await db.query(query, [clientId]);
        return result.rows;
    },

    getByFreelancerId: async (freelancerId) => {
        const query = 'SELECT * FROM contracts WHERE freelancer_id = $1';
        const result = await db.query(query, [freelancerId]);
        return result.rows;
    }

};

module.exports = Contract;