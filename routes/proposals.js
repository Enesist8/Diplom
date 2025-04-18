// routes/proposals.js
const express = require('express');
const router = express.Router();
const Proposal = require('../models/proposal');
const auth = require('../middleware/auth');

// Создание предложения (только для авторизованных фрилансеров)
router.post('/', auth, async (req, res) => {
    try {
        if (req.session.userType !== 'freelancer') {
            return res.status(403).json({ message: 'Forbidden: Only freelancers can create proposals' });
        }
        const newProposal = await Proposal.create({...req.body, freelancer_id: req.session.userId });
        res.status(201).json(newProposal);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create proposal' });
    }
});

// Получение предложения по ID
router.get('/:id', async (req, res) => {
    try {
        const proposal = await Proposal.getById(req.params.id);
        if (proposal) {
            res.json(proposal);
        } else {
            res.status(404).json({ message: 'Proposal not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to get proposal' });
    }
});

// Получение всех предложений для проекта
router.get('/project/:projectId', async (req, res) => {
    try {
        const proposals = await Proposal.getAllForProject(req.params.projectId);
        res.json(proposals);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to get proposals' });
    }
});

// Обновление предложения
router.put('/:id', auth, async (req, res) => {
    try {
        const proposalId = req.params.id;
        const proposal = await Proposal.getById(proposalId);
        // Проверка, существует ли предложение
        if (!proposal) {
            return res.status(404).json({ message: 'Proposal not found' });
        }

        // Проверка прав доступа (фрилансер, создавший предложение)
        if (proposal.freelancer_id !== req.session.userId) {
            return res.status(403).json({ message: 'Forbidden: You are not the owner of this proposal' });
        }

        const updatedProposal = await Proposal.update(proposalId, req.body);
        if (updatedProposal) {
            res.json(updatedProposal);
        } else {
            res.status(500).json({ message: 'Failed to update proposal' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update proposal' });
    }
});

// Удаление предложения
router.delete('/:id', auth, async (req, res) => {
    try {
        const proposalId = req.params.id;
        const proposal = await Proposal.getById(proposalId);

        // Проверка, существует ли предложение
        if (!proposal) {
            return res.status(404).json({ message: 'Proposal not found' });
        }

        // Проверка прав доступа (фрилансер, создавший предложение)
        if (proposal.freelancer_id !== req.session.userId) {
            return res.status(403).json({ message: 'Forbidden: You are not the owner of this proposal' });
        }

        const deleted = await Proposal.delete(proposalId);
        if (deleted) {
            res.status(204).send();
        } else {
            res.status(500).json({ message: 'Failed to delete proposal' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete proposal' });
    }
});

module.exports = router;