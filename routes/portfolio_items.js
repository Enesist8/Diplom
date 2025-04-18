// routes/portfolio_items.js
const express = require('express');
const router = express.Router();
const PortfolioItem = require('../models/portfolio_item');
const auth = require('../middleware/auth');

// Создание элемента портфолио
router.post('/', auth, async (req, res) => {
    try {
        const newItem = await PortfolioItem.create({...req.body, user_id: req.session.userId });
        res.status(201).json(newItem);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create portfolio item' });
    }
});

// Получение элемента портфолио по ID
router.get('/:id', async (req, res) => {
    try {
        const item = await PortfolioItem.getById(req.params.id);
        if (item) {
            res.json(item);
        } else {
            res.status(404).json({ message: 'Portfolio item not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to get portfolio item' });
    }
});

// Обновление элемента портфолио
router.put('/:id', auth, async (req, res) => {
    try {
        const itemId = req.params.id;
        const item = await PortfolioItem.getById(itemId);

        if (!item) {
            return res.status(404).json({ message: 'Portfolio item not found' });
        }

        // Добавьте проверку прав доступа (например, только владелец может обновлять)
        if (item.user_id !== req.session.userId) {
            return res.status(403).json({ message: 'You are not authorized to update this portfolio item' });
        }
        const updatedItem = await PortfolioItem.update(itemId, req.body);
        if (updatedItem) {
            res.json(updatedItem);
        } else {
            res.status(500).json({ message: 'Failed to update portfolio item' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update portfolio item' });
    }
});

// Удаление элемента портфолио
router.delete('/:id', auth, async (req, res) => {
    try {
        const itemId = req.params.id;
        const item = await PortfolioItem.getById(itemId);

        if (!item) {
            return res.status(404).json({ message: 'Portfolio item not found' });
        }

        // Добавьте проверку прав доступа (например, только владелец может удалять)
        if (item.user_id !== req.session.userId) {
            return res.status(403).json({ message: 'You are not authorized to delete this portfolio item' });
        }

        const deleted = await PortfolioItem.delete(itemId);
        if (deleted) {
            res.status(204).send();
        } else {
            res.status(500).json({ message: 'Failed to delete portfolio item' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete portfolio item' });
    }
});

module.exports = router;