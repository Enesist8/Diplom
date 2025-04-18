const express = require('express');
const router = express.Router();
const Message = require('../models/message');
const auth = require('../middleware/auth');
const { validate: validateUUID } = require('uuid');

// Отправка сообщения
router.post('/', auth(['client', 'freelancer']), async (req, res) => {
    try {
        const { recipient_id, content } = req.body;
        const sender_id = req.session.userId;

        if (!recipient_id || !content) {
            return res.status(400).json({ error: 'Recipient ID and content are required' });
        }

        const message = await Message.create({
            sender_id,
            recipient_id,
            content
        });

        res.status(201).json(message);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Получение переписки
router.get('/conversation/:user_id', auth(['client', 'freelancer']), async (req, res) => {
    try {
        const other_user_id = req.params.user_id;
        const current_user_id = req.session.userId;
        const { project_id } = req.query;

        const messages = await Message.getConversation(
            current_user_id,
            other_user_id,
            project_id || null
        );

        res.json(messages);
    } catch (error) {
        console.error('Error getting conversation:', error);
        res.status(500).json({ error: error.message });
    }
});

// Получение списка диалогов
router.get('/dialogs', auth(['client', 'freelancer']), async (req, res) => {
    try {
        const user_id = req.session.userId;
        const dialogs = await Message.getDialogs(user_id);
        res.json(dialogs);
    } catch (error) {
        console.error('Error getting dialogs:', error);
        res.status(500).json({ error: error.message });
    }
});

// Пометка сообщений как прочитанных
router.patch('/read', auth(['client', 'freelancer']), async (req, res) => {
    try {
        const { message_ids } = req.body;
        const user_id = req.session.userId;

        if (!Array.isArray(message_ids)) {
            return res.status(400).json({ error: 'Message IDs must be an array' });
        }

        const updatedMessages = await Message.markAsRead(message_ids, user_id);
        res.json(updatedMessages);
    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({ error: error.message });
    }
});

// Получение количества непрочитанных сообщений
router.get('/unread-count', auth(['client', 'freelancer']), async (req, res) => {
    try {
        const user_id = req.session.userId;
        const count = await Message.getUnreadCount(user_id);
        res.json({ count });
    } catch (error) {
        console.error('Error getting unread count:', error);
        res.status(500).json({ error: error.message });
    }
});

// Удаление сообщения
router.delete('/:message_id', auth(['client', 'freelancer']), async (req, res) => {
    try {
        const { message_id } = req.params;
        const user_id = req.session.userId;

        const deleted = await Message.delete(message_id, user_id);
        if (deleted) {
            res.status(204).end();
        } else {
            res.status(404).json({ error: 'Message not found or access denied' });
        }
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;