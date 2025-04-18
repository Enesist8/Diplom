const express = require('express');
const router = express.Router();
const Contract = require('../models/contract');
const auth = require('../middleware/auth');

// Создание контракта (только для авторизованных пользователей)
router.post('/', async (req, res) => {
    try {
        console.log('Received request body:', req.body); // Логирование тела запроса

        // Создание контракта
        const newContract = await Contract.create(req.body);

        // Логирование успешного создания контракта
        console.log('Contract created successfully:', newContract);

        // Возвращаем созданный контракт
        res.status(201).json(newContract); // Убедитесь, что возвращается JSON
    } catch (error) {
        // Логирование ошибки
        console.error('Error creating contract:', error);

        // Возвращаем ошибку клиенту
        res.status(500).json({ error: 'Failed to create contract', details: error.message });
    }
});

// Получение контракта по ID
router.get('/:id', async (req, res) => {
    try {
        const contract = await Contract.getById(req.params.id);
        if (contract) {
            res.json(contract);
        } else {
            res.status(404).json({ message: 'Contract not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to get contract' });
    }
});

// Получение контракта по Project ID
router.get('/project/:projectId', async (req, res) => {
    try {
        const contracts = await Contract.getByProjectId(req.params.projectId);
        res.json(contracts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to get contracts' });
    }
});

// Обновление контракта
router.put('/:id', auth, async (req, res) => {
    try {
        const contractId = req.params.id;
        const contract = await Contract.getById(contractId);

        if (!contract) {
            return res.status(404).json({ message: 'Contract not found' });
        }

        // Проверка прав доступа (участвующие стороны в контракте)
        if (contract.client_id !== req.session.userId && contract.freelancer_id !== req.session.userId) {
            return res.status(403).json({ message: 'Forbidden: You are not part of this contract' });
        }
        const updatedContract = await Contract.update(contractId, req.body);
        if (updatedContract) {
            res.json(updatedContract);
        } else {
            res.status(500).json({ message: 'Failed to update contract' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update contract' });
    }
});

// Удаление контракта
router.delete('/:id', auth, async (req, res) => {
    try {
        const contractId = req.params.id;
        const contract = await Contract.getById(contractId);
        if (!contract) {
            return res.status(404).json({ message: 'Contract not found' });
        }

        // Проверка прав доступа (участвующие стороны в контракте)
        if (contract.client_id !== req.session.userId && contract.freelancer_id !== req.session.userId) {
            return res.status(403).json({ message: 'Forbidden: You are not part of this contract' });
        }

        const deleted = await Contract.delete(contractId);
        if (deleted) {
            res.status(204).send(); // 204 No Content
        } else {
            res.status(500).json({ message: 'Failed to delete contract' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete contract' });
    }
});

// Получение контрактов для текущего пользователя
router.get('/', auth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const userType = req.session.userType;

        let contracts;

        if (userType === 'client') {
            contracts = await Contract.getByClientId(userId);
        } else if (userType === 'freelancer') {
            contracts = await Contract.getByFreelancerId(userId);
        } else {
            return res.status(403).json({ message: 'Forbidden: Invalid user type' });
        }

        res.json(contracts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to get contracts' });
    }
});

module.exports = router;