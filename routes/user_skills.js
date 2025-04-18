// routes/user_skills.js
const express = require('express');
const router = express.Router();
const UserSkill = require('../models/user_skills');
const auth = require('../middleware/auth');

// Добавление навыка пользователю
router.post('/', auth, async (req, res) => {
    const { skill_tag_id } = req.body;
    try {
        const newItem = await UserSkill.create(req.session.userId, skill_tag_id);
        if (newItem) {
            res.status(201).json(newItem);
        } else {
            res.status(500).json({ message: 'Failed to add skill to user' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add skill to user' });
    }
});

// Получение навыков пользователя
router.get('/user/:userId', async (req, res) => {
    try {
        const skills = await UserSkill.getByUserId(req.params.userId);
        res.json(skills);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to get user skills' });
    }
});

//Удаление всех навыков у пользователя (например, при удалении пользователя)
router.delete('/user/:userId', auth, async (req, res) => {
    try {
        const userId = req.params.userId;
        // Проверка прав доступа - только админ или сам пользователь может удалять свои навыки
        if (req.session.userId !== userId) {
            return res.status(403).json({ message: 'Forbidden: You are not authorized to delete these skills' });
        }

        const deleted = await UserSkill.deleteByUserId(userId);
        if (deleted) {
            res.status(204).send(); // 204 No Content
        } else {
            res.status(500).json({ message: 'Failed to delete user skills' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete user skills' });
    }
});

// Удаление навыка у пользователя
router.delete('/', auth, async (req, res) => {
    const { skill_tag_id } = req.body;
    try {
        const deleted = await UserSkill.delete(req.session.userId, skill_tag_id);
        if (deleted) {
            res.status(204).send();
        } else {
            res.status(500).json({ message: 'Failed to delete skill from user' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete skill from user' });
    }
});

module.exports = router;