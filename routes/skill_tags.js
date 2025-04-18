// routes/skill_tags.js
const express = require('express');
const router = express.Router();
const SkillTag = require('../models/skill_tag');
const auth = require('../middleware/auth'); // Пример: только админ может управлять тегами

// Создание тега навыка
router.post('/', auth, async (req, res) => {
    try {
        const newTag = await SkillTag.create(req.body);
        res.status(201).json(newTag);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create skill tag' });
    }
});

// Получение тега навыка по ID
router.get('/:id', async (req, res) => {
    try {
        const tag = await SkillTag.getById(req.params.id);
        if (tag) {
            res.json(tag);
        } else {
            res.status(404).json({ message: 'Skill tag not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to get skill tag' });
    }
});

// Получение всех тегов навыков
router.get('/', async (req, res) => {
    try {
        const tags = await SkillTag.getAll();
        res.json(tags);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to get skill tags' });
    }
});

// Обновление тега навыка
router.put('/:id', auth, async (req, res) => {
    try {
        const tagId = req.params.id;
        const tag = await SkillTag.getById(tagId);
        if (!tag) {
            return res.status(404).json({ message: 'Skill tag not found' });
        }

        // Проверьте права доступа, например, только админ может обновлять теги

        const updatedTag = await SkillTag.update(tagId, req.body);
        if (updatedTag) {
            res.json(updatedTag);
        } else {
            res.status(500).json({ message: 'Failed to update skill tag' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update skill tag' });
    }
});

// Удаление тега навыка
router.delete('/:id', auth, async (req, res) => {
    try {
        const tagId = req.params.id;
        const tag = await SkillTag.getById(tagId);

        if (!tag) {
            return res.status(404).json({ message: 'Skill tag not found' });
        }

        // Проверьте права доступа, например, только админ может удалять теги

        const deleted = await SkillTag.delete(tagId);
        if (deleted) {
            res.status(204).send();
        } else {
            res.status(500).json({ message: 'Failed to delete skill tag' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete skill tag' });
    }
});

module.exports = router;