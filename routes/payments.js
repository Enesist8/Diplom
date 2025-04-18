const express = require('express');
const router = express.Router();
const Payment = require('../models/payment');
const auth = require('../middleware/auth');
const User = require('../models/user');
const Project = require('../models/project');
// Обработка CORS preflight
router.options('/payments', (req, res) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.status(204).end();
});

// Создание платежа
// Обработка GET запроса (для истории платежей)
router.get('/', auth, async (req, res) => {
    try {
        const payments = await Payment.findByUserId(req.user.user_id);
        res.json({
            success: true,
            payments
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Ошибка получения платежей'
        });
    }
});

router.post('/', auth, async (req, res) => {
    console.log('🔔 [POST] /payments INIT');

    try {
        const { project_id, amount, payment_method } = req.body;
        const user_id = req.user?.user_id;
        const user_type = req.user?.user_type;

        console.log('📦 Данные от клиента:', req.body);

        // Проверка авторизации и ролей
        if (!user_id || user_type !== 'client') {
            console.warn('❌ Пользователь не клиент или не авторизован');
            return res.status(403).json({
                success: false,
                message: 'Только авторизованные клиенты могут совершать платежи'
            });
        }

        // Валидация полей
        if (!project_id || !amount || !payment_method) {
            console.warn('❌ Отсутствуют обязательные поля');
            return res.status(400).json({
                success: false,
                message: 'Требуются поля: project_id, amount, payment_method'
            });
        }

        // Валидация способа оплаты и суммы
        Payment.validatePaymentMethod(payment_method);
        Payment.validateAmount(amount);

        // Получение проекта
        const project = await Project.findById(project_id);
        if (!project) {
            console.warn('❌ Проект не найден:', project_id);
            return res.status(404).json({
                success: false,
                message: 'Проект не найден'
            });
        }

        console.log('✅ Проект найден:', project.status);

        // Проверка статуса проекта
        if (!['completed', 'Завершен'].includes(project.status)) {
            return res.status(400).json({
                success: false,
                message: 'Проект должен быть завершён для проведения платежа'
            });
        }

        // Создание платежа
        const payment = await Payment.create({
            project_id,
            payer_id: user_id,
            payee_id: project.freelancer_id || null,
            amount: parseFloat(amount),
            payment_method,
            status: 'completed'
        });

        console.log('✅ Платеж создан:', payment);

        return res.status(200).json({
            success: true,
            message: 'Платеж успешно выполнен',
            payment
        });

    } catch (error) {
        console.error('💥 Ошибка в /payments:', error.message || error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Внутренняя ошибка сервера'
        });
    }
});

// Получение информации о платеже
router.get('/:id', auth, async (req, res) => {
    try {
        const payment = await Payment.getById(req.params.id);

        // Проверка прав доступа
        if (![payment.payer_id, payment.payee_id].includes(req.user.user_id)) {
            return res.status(403).json({ error: 'Нет доступа к этому платежу' });
        }

        if (payment) {
            res.json(payment);
        } else {
            res.status(404).json({ error: 'Платеж не найден' });
        }
    } catch (error) {
        console.error('Ошибка при получении платежа:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение платежей по контракту
router.get('/contract/:contractId', auth, async (req, res) => {
    try {
        const payments = await Payment.getByContractId(req.params.contractId);
        res.json(payments);
    } catch (error) {
        console.error('Ошибка при получении платежей:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение истории платежей пользователя
router.get('/history/my', auth, async (req, res) => {
    try {
        let payments;
        if (req.user.user_type === 'client') {
            payments = await Payment.getByPayer(req.user.user_id);
        } else {
            payments = await Payment.getByPayee(req.user.user_id);
        }
        res.json(payments);
    } catch (error) {
        console.error('Ошибка при получении истории платежей:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Обновление статуса платежа (для админа/платежной системы)
router.put('/:id/status', auth, async (req, res) => {
    try {
        // Только админ может менять статус вручную
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ error: 'Недостаточно прав' });
        }

        const { status, transaction_id } = req.body;
        const payment = await Payment.updateStatus(req.params.id, status, transaction_id);

        if (status === 'completed') {
            // Обновляем баланс получателя
            await User.updateBalance(payment.payee_id, payment.amount);
        }

        res.json({ success: true, payment });
    } catch (error) {
        console.error('Ошибка при обновлении статуса платежа:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.get('/freelancer/stats', auth('freelancer'), async (req, res) => {
    try {
        const stats = await Payment.getFreelancerStats(req.session.userId);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/freelancer/stats', auth('freelancer'), async (req, res) => {
    try {
        const freelancer_id = req.session.userId;

        // Пример запроса - адаптируйте под вашу БД
        const query = `
            SELECT 
                COUNT(*) as total_payments,
                COALESCE(SUM(amount), 0) as total_earned
            FROM payments
            WHERE freelancer_id = $1
        `;

        const result = await db.query(query, [freelancer_id]);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching freelancer stats:', error);
        res.status(500).json({ error: 'Failed to load stats' });
    }
});

router.get('/project/:projectId/check', auth, async (req, res) => {
    try {
        const project = await Project.findById(req.params.projectId);
        if (!project) {
            return res.status(404).json({ error: 'Проект не найден' });
        }

        // Проверка прав доступа
        if (project.client_id !== req.user.user_id) {
            return res.status(403).json({ error: 'Нет доступа к проекту' });
        }

        // Проверка статуса проекта
        if (project.status !== 'completed') {
            return res.json({
                can_pay: false,
                reason: 'Проект не завершен',
                status: project.status
            });
        }

        // Проверка наличия фрилансера
        const contract = await Contract.findByProjectId(req.params.projectId);
        if (!contract || !contract.freelancer_id) {
            return res.json({
                can_pay: false,
                reason: 'Фрилансер не назначен'
            });
        }

        // Проверка существующих платежей
        const payments = await Payment.findByContractId(contract.contract_id);
        if (payments.length > 0) {
            return res.json({
                can_pay: false,
                reason: 'Платеж уже выполнен',
                payment: payments[0]
            });
        }

        res.json({
            can_pay: true,
            amount: contract.amount,
            freelancer_id: contract.freelancer_id,
            contract_id: contract.contract_id
        });

    } catch (error) {
        console.error('Ошибка проверки платежа:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;