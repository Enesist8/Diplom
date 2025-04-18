// routes/users.js
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const bcrypt = require('bcrypt');
const auth = require('../middleware/auth');

// Регистрация пользователя
router.post('/register', async (req, res) => {
    const { username, email, password, first_name, last_name, user_type } = req.body;

    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    try {
        const existingUser = await User.getByUsername(username);
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const existingUserByEmail = await User.getByEmail(email);
        if (existingUserByEmail) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const newUser = await User.create({ username, email, password, first_name, last_name, user_type });
        req.session.userId = newUser.user_id;

        res.status(201).json(newUser);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Авторизация пользователя
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.getByEmail(email);
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        req.session.userId = user.user_id;
        req.session.userType = user.user_type;
        req.session.save((err) => {
            if (err) {
                console.error("Ошибка при сохранении сессии:", err);
                return res.status(500).json({ message: 'Server error' });
            }
            res.json({ message: 'Login successful', user });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Выход из системы
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Failed to logout' });
        }
        res.json({ message: 'Logged out successfully' });
    });
});

// Получение данных текущего пользователя
router.get('/me', auth(['client', 'freelancer']), async (req, res) => {
    try {
        const user = await User.getById(req.session.userId);
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

router.get('/search', auth(['client', 'freelancer']), async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                error: 'Search query must be at least 2 characters long'
            });
        }

        // Используем метод search из модели User
        const users = await User.search(q, req.session.userId);

        res.json(users);
    } catch (error) {
        console.error('Error in user search:', error);
        res.status(500).json({
            error: 'Failed to perform search',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Получение пользователя по ID
router.get('/:id', async (req, res) => {
    try {
        const user = await User.getById(req.params.id);
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

// Обновление пользователя
router.put('/:id', auth(['client', 'freelancer']), async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.getById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (req.session.userId !== userId) {
            return res.status(403).json({ message: 'Forbidden: You are not authorized to update this user' });
        }

        const updatedUser = await User.update(userId, req.body);
        if (updatedUser) {
            res.json(updatedUser);
        } else {
            res.status(500).json({ message: 'Failed to update user' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Удаление пользователя
router.delete('/:id', auth(['client', 'freelancer']), async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.getById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (req.session.userId !== userId) {
            return res.status(403).json({ message: 'Forbidden: You are not authorized to delete this user' });
        }

        const deleted = await User.delete(userId);
        if (deleted) {
            res.status(204).send();
        } else {
            res.status(500).json({ message: 'Failed to delete user' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Получение всех пользователей
router.get('/', async (req, res) => {
    try {
        const users = await User.getAll();
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to get users' });
    }
});




module.exports = router;