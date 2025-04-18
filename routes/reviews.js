// routes/reviews.js
const express = require('express');
const router = express.Router();
const Review = require('../models/review');
const auth = require('../middleware/auth');

// Создание отзыва
router.post('/', auth, async (req, res) => {
    try {
        const newReview = await Review.create(req.body);
        res.status(201).json(newReview);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create review' });
    }
});

// Получение отзыва по ID
router.get('/:id', async (req, res) => {
    try {
        const review = await Review.getById(req.params.id);
        if (review) {
            res.json(review);
        } else {
            res.status(404).json({ message: 'Review not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to get review' });
    }
});

// Обновление отзыва
router.put('/:id', auth, async (req, res) => {
    try {
        const reviewId = req.params.id;
        const review = await Review.getById(reviewId);

        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        if (review.reviewer_id !== req.session.userId) {
            return res.status(403).json({ message: 'You are not authorized to update this review' });
        }

        const updatedReview = await Review.update(reviewId, req.body);
        if (updatedReview) {
            res.json(updatedReview);
        } else {
            res.status(500).json({ message: 'Failed to update review' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update review' });
    }
});

// Удаление отзыва
router.delete('/:id', auth, async (req, res) => {
    try {
        const reviewId = req.params.id;
        const review = await Review.getById(reviewId);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Добавьте проверку прав доступа (например, только автор отзыва может его удалить)
        if (review.reviewer_id !== req.session.userId) {
            return res.status(403).json({ message: 'You are not authorized to delete this review' });
        }

        const deleted = await Review.delete(reviewId);
        if (deleted) {
            res.status(204).send();
        } else {
            res.status(500).json({ message: 'Failed to delete review' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete review' });
    }
});

module.exports = router;