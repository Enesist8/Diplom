// middleware/auth.js
const { validate: validateUUID } = require('uuid');
const User = require('../models/user');

const auth = (roles = []) => {
    return async (req, res, next) => {
        try {
            // Пропускаем проверку для маршрута поиска
            if (req.path.includes('/search')) {
                return next();
            }
            if (!req.session.userId) {
                return res.status(401).json({
                    error: 'Не авторизован: требуется вход в систему'
                });
            }

            const userId = String(req.session.userId).trim();
            if (!validateUUID(userId)) {
                return res.status(401).json({
                    error: 'Неверный формат идентификатора пользователя'
                });
            }

            const user = await User.getById(userId);
            if (!user) {
                return res.status(401).json({
                    error: 'Пользователь не найден'
                });
            }

            const userType = user.user_type || req.session.userType;
            if (roles.length > 0) {
                const requiredRoles = typeof roles === 'string' ? [roles] : roles;
                if (!requiredRoles.includes(userType)) {
                    return res.status(403).json({
                        error: `Доступ запрещен: требуется роль ${requiredRoles.join(' или ')}`
                    });
                }
            }

            req.user = user;
            next();
        } catch (error) {
            console.error('Auth middleware error:', error);
            res.status(500).json({
                error: 'Ошибка аутентификации',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    };
};

module.exports = auth;