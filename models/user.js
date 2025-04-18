// models/user.js
const db = require('../db');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { validate: validateUUID } = require('uuid');

const User = {
    create: async (userData) => {
        const { username, email, password, first_name, last_name, user_type } = userData;
        const passwordHash = await bcrypt.hash(password, 10);
        const query = `
            INSERT INTO users (user_id, username, email, password_hash, first_name, last_name, user_type)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
        `;
        const user_id = uuidv4();
        const values = [user_id, username, email, passwordHash, first_name, last_name, user_type];
        const result = await db.query(query, values);
        return result.rows[0];
    },

    getById: async (id) => {
        if (!id) throw new Error('User ID is required');

        const normalizedId = String(id).trim().toLowerCase();

        // Добавьте проверку на специальные маршруты
        if (normalizedId === 'search') {
            throw new Error('Invalid user ID - this appears to be a route conflict');
        }

        // Более гибкая валидация UUID
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizedId)) {
            throw new Error(`Invalid UUID format: ${normalizedId}`);
        }

        const query = 'SELECT * FROM users WHERE user_id = $1';
        const result = await db.query(query, [normalizedId]);

        if (!result.rows[0]) {
            throw new Error('User not found');
        }

        return result.rows[0];
    },


    getByEmail: async (email) => {
        const query = 'SELECT * FROM users WHERE email = $1';
        const result = await db.query(query, [email]);
        return result.rows[0];
    },

    update: async (id, userData) => {
        const normalizedId = String(id).trim().toLowerCase();
        if (!validateUUID(normalizedId)) {
            throw new Error('Invalid UUID format');
        }

        const fields = [];
        const values = [];
        let paramIndex = 1;

        Object.entries(userData).forEach(([key, value]) => {
            if (value !== undefined) {
                fields.push(`${key} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        });

        if (fields.length === 0) {
            return null;
        }

        values.push(normalizedId);
        const query = `
            UPDATE users
            SET ${fields.join(', ')}, updated_at = NOW()
            WHERE user_id = $${paramIndex}
            RETURNING *
        `;

        const result = await db.query(query, values);
        return result.rows[0];
    },

    delete: async (id) => {
        const normalizedId = String(id).trim().toLowerCase();
        if (!validateUUID(normalizedId)) {
            throw new Error('Invalid UUID format');
        }

        const query = 'DELETE FROM users WHERE user_id = $1 RETURNING *';
        const result = await db.query(query, [normalizedId]);
        return result.rowCount > 0;
    },

    getAll: async () => {
        const query = 'SELECT * FROM users';
        const result = await db.query(query);
        return result.rows;
    },

    getByUsername: async (username) => {
        const query = 'SELECT * FROM users WHERE username = $1';
        const result = await db.query(query, [username]);
        return result.rows[0];
    },

    search: async (query, currentUserId) => {
        const normalizedId = String(currentUserId).trim().toLowerCase();
        if (!validateUUID(normalizedId)) {
            throw new Error('Invalid current user UUID format');
        }

        const searchQuery = `
            SELECT 
                user_id as id,
                username,
                first_name,
                last_name,
                user_type,
                profile_picture_url,
                email
            FROM users
            WHERE 
                (username ILIKE $1 OR
                first_name ILIKE $1 OR
                last_name ILIKE $1 OR
                email ILIKE $1 OR
                user_id::text ILIKE $1)
                AND user_id != $2
                AND is_active = true
            ORDER BY
                CASE
                    WHEN username ILIKE $1 THEN 1
                    WHEN first_name ILIKE $1 THEN 2
                    WHEN last_name ILIKE $1 THEN 3
                    WHEN user_id::text ILIKE $1 THEN 4
                    ELSE 5
                END,
                username
            LIMIT 10
        `;

        const searchTerm = `%${query}%`;
        const result = await db.query(searchQuery, [searchTerm, normalizedId]);
        return result.rows;
    },


    updateBalance: async (userId, amount) => {
        const query = `
            UPDATE users 
            SET balance = COALESCE(balance, 0) + $1
            WHERE user_id = $2
            RETURNING *
        `;
        const result = await db.query(query, [amount, userId]);
        return result.rows[0];
    },

    getFreelancerStats: async (userId) => {
        const query = `
            SELECT 
                COUNT(p.payment_id) as total_payments,
                COALESCE(SUM(p.amount), 0) as total_earned
            FROM payments p
            WHERE p.payee_id = $1 AND p.status = 'completed'
        `;
        const result = await db.query(query, [userId]);
        return result.rows[0];
    }

};



module.exports = User;