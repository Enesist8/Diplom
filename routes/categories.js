// routes/categories.js
const express = require('express');
const router = express.Router();
const Category = require('../models/category');
const auth = require('../middleware/auth'); // Пример: только админ может управлять категориями

// Создание категории
router.post('/', auth, async (req, res) => {
    try {
        const newCategory = await Category.create(req.body);
        res.status(201).json(newCategory);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create category' });
    }
});

// Получение категории по ID
router.get('/:id', async (req, res) => {
    try {
        const category = await Category.getById(req.params.id);
        if (category) {
            res.json(category);
        } else {
            res.status(404).json({ message: 'Category not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to get category' });
    }
});

// Получение всех категорий
router.get('/', async (req, res) => {
    try {
        const categories = await Category.getAll();
        res.json(categories);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to get categories' });
    }
});

// Обновление категории
router.put('/:id', auth, async (req, res) => {
    try {
        const categoryId = req.params.id;
        const category = await Category.getById(categoryId);

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // Проверьте права доступа, например, только админ может обновлять категории
        const updatedCategory = await Category.update(categoryId, req.body);
        if (updatedCategory) {
            res.json(updatedCategory);
        } else {
            res.status(500).json({ message: 'Failed to update category' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update category' });
    }
});

// Удаление категории
router.delete('/:id', auth, async (req, res) => {
    try {
        const categoryId = req.params.id;
        const category = await Category.getById(categoryId);

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // Проверьте права доступа, например, только админ может удалять категории

        const deleted = await Category.delete(categoryId);
        if (deleted) {
            res.status(204).send();
        } else {
            res.status(500).json({ message: 'Failed to delete category' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete category' });
    }
});

module.exports = router;