const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const { validate: validateUUID } = require('uuid');

const Message = {
    create: async (messageData) => {
        const { sender_id, recipient_id, content } = messageData;

        // Улучшенная валидация UUID с дополнительными проверками
        const validateAndNormalizeUUID = (uuid) => {
            if (!uuid) {
                console.error('Empty UUID provided');
                return null;
            }

            // Приводим к строке, удаляем пробелы и лишние символы
            const normalized = String(uuid).trim().toLowerCase();

            // Проверка формата UUID
            const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidPattern.test(normalized)) {
                console.error('Invalid UUID format:', normalized);
                return null;
            }

            return normalized;
        };

        const normalizedSenderId = validateAndNormalizeUUID(sender_id);
        const normalizedRecipientId = validateAndNormalizeUUID(recipient_id);

        if (!normalizedSenderId || !normalizedRecipientId) {
            console.error('Invalid UUIDs:', {
                original_sender: sender_id,
                original_recipient: recipient_id,
                normalized_sender: normalizedSenderId,
                normalized_recipient: normalizedRecipientId
            });
            throw new Error('Invalid UUID for sender or recipient');
        }

        // Проверка что отправитель и получатель не совпадают
        if (normalizedSenderId === normalizedRecipientId) {
            console.error('Sender and recipient are the same:', normalizedSenderId);
            throw new Error('Sender and recipient cannot be the same');
        }

        // Проверка содержания сообщения
        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            console.error('Invalid message content:', content);
            throw new Error('Message content is required');
        }

        const query = `
        INSERT INTO messages (message_id, sender_id, recipient_id, content)
        VALUES ($1, $2, $3, $4)
        RETURNING *
    `;

        const message_id = uuidv4();
        const values = [message_id, normalizedSenderId, normalizedRecipientId, content.trim()];

        try {
            console.log('Executing query with values:', values);
            const result = await db.query(query, values);

            // Логирование успешного создания сообщения
            console.log('Message created successfully:', result.rows[0]);
            return result.rows[0];
        } catch (error) {
            console.error('Database error:', error);
            throw new Error('Failed to create message in database');
        }
    },

    getById: async (id) => {
        if (!validateUUID(id)) {
            throw new Error('Invalid message ID');
        }

        console.log('Fetching message with ID:', id);
        const query = 'SELECT * FROM messages WHERE message_id = $1';
        const result = await db.query(query, [id]);
        return result.rows[0];
    },

    getConversation: async (user1_id, user2_id, project_id = null) => {
        if (!validateUUID(user1_id) || !validateUUID(user2_id)) {
            throw new Error('Invalid user UUIDs');
        }

        let query, values;

        if (project_id) {
            query = `
                SELECT * FROM messages
                WHERE ((sender_id = $1 AND recipient_id = $2)
                   OR (sender_id = $2 AND recipient_id = $1))
                   AND (project_id = $3 OR project_id IS NULL)
                ORDER BY sent_at ASC
            `;
            values = [user1_id, user2_id, project_id];
        } else {
            query = `
                SELECT * FROM messages
                WHERE (sender_id = $1 AND recipient_id = $2)
                   OR (sender_id = $2 AND recipient_id = $1)
                ORDER BY sent_at ASC
            `;
            values = [user1_id, user2_id];
        }

        console.log('Fetching conversation with query:', query, values);
        const result = await db.query(query, values);
        return result.rows;
    },

    getDialogs: async (user_id) => {
        if (!validateUUID(user_id)) {
            throw new Error('Invalid user ID');
        }

        const query = `
            WITH last_messages AS (
                SELECT
                    CASE
                        WHEN sender_id = $1 THEN recipient_id
                        ELSE sender_id
                        END AS interlocutor_id,
                    MAX(sent_at) AS last_message_time
                FROM messages
                WHERE sender_id = $1 OR recipient_id = $1
                GROUP BY interlocutor_id
            ),
                 user_data AS (
                     SELECT
                         u.user_id,
                         u.username,
                         u.first_name,
                         u.last_name,
                         u.user_type,
                         u.profile_picture_url
                     FROM users u
                 )
            SELECT
                lm.interlocutor_id,
                ud.username,
                ud.first_name,
                ud.last_name,
                ud.user_type,
                ud.profile_picture_url,
                m.content AS last_message,
                lm.last_message_time,
                COUNT(CASE WHEN m.is_read = false AND m.recipient_id = $1 THEN 1 END) AS unread_count
            FROM last_messages lm
                     JOIN messages m ON
                (m.sender_id = $1 AND m.recipient_id = lm.interlocutor_id OR
                 m.sender_id = lm.interlocutor_id AND m.recipient_id = $1) AND
                m.sent_at = lm.last_message_time
                     JOIN user_data ud ON ud.user_id = lm.interlocutor_id
            GROUP BY lm.interlocutor_id, ud.username, ud.first_name, ud.last_name,
                     ud.user_type, ud.profile_picture_url, m.content, lm.last_message_time
            ORDER BY lm.last_message_time DESC
        `;

        const result = await db.query(query, [user_id]);
        return result.rows;
    },

    markAsRead: async (messageIds, user_id) => {
        if (!Array.isArray(messageIds) || messageIds.some(id => !validateUUID(id))) {
            throw new Error('Invalid message IDs array');
        }

        const query = `
            UPDATE messages
            SET is_read = true
            WHERE message_id = ANY($1) AND recipient_id = $2
                RETURNING *
        `;

        const result = await db.query(query, [messageIds, user_id]);
        return result.rows;
    },

    getUnreadCount: async (user_id) => {
        if (!validateUUID(user_id)) {
            throw new Error('Invalid user ID');
        }

        const query = `
            SELECT COUNT(*) FROM messages
            WHERE recipient_id = $1 AND is_read = false
        `;

        console.log('Getting unread count for user:', user_id);
        const result = await db.query(query, [user_id]);
        return parseInt(result.rows[0].count);
    },

    delete: async (message_id, user_id) => {
        if (!validateUUID(message_id) || !validateUUID(user_id)) {
            throw new Error('Invalid UUID');
        }

        const query = `
            DELETE FROM messages
            WHERE message_id = $1 AND (sender_id = $2 OR recipient_id = $2)
            RETURNING *
        `;

        console.log('Deleting message:', message_id, 'by user:', user_id);
        const result = await db.query(query, [message_id, user_id]);
        return result.rowCount > 0;
    }
};



module.exports = Message;