// routes/project_skills.js
const express = require('express');
const router = express.Router();
const ProjectSkill = require('../models/project_skills');
const auth = require('../middleware/auth');

// Добавление навыка проекту
router.post('/', auth, async (req, res) => {
    const { project_id, skill_tag_id } = req.body;
    try {
        const newItem = await ProjectSkill.create(project_id, skill_tag_id);
        if (newItem) {
            res.status(201).json(newItem);
        } else {
            res.status(500).json({ message: 'Failed to add skill to project' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add skill to project' });
    }
});

// Получение навыков проекта
router.get('/project/:projectId', async (req, res) => {
    try {
        const skills = await ProjectSkill.getByProjectId(req.params.projectId);
        res.json(skills);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to get project skills' });
    }
});

//Удаление всех навыков у проекта (например, при удалении проекта)
router.delete('/project/:projectId', auth, async (req, res) => {
    try {
        const projectId = req.params.projectId;
        // Проверка прав доступа - только клиент, создавший проект, может удалять его навыки
        // (Нужно получить project_id и проверить client_id)

        const deleted = await ProjectSkill.deleteByProjectId(projectId);
        if (deleted) {
            res.status(204).send(); // 204 No Content
        } else {
            res.status(500).json({ message: 'Failed to delete project skills' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete project skills' });
    }
});

// Удаление навыка у проекта
router.delete('/', auth, async (req, res) => {
    const { project_id, skill_tag_id } = req.body;
    try {
        const deleted = await ProjectSkill.delete(project_id, skill_tag_id);
        if (deleted) {
            res.status(204).send();
        } else {
            res.status(500).json({ message: 'Failed to delete skill from project' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete skill from project' });
    }
});

module.exports = router;