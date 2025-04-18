const { validate: validateUUID } = require('uuid');

module.exports = (req, res, next) => {
    const { client_id } = req.body;

    if (!client_id) {
        return res.status(400).json({ message: 'client_id is required' });
    }

    if (!validateUUID(client_id)) {
        return res.status(400).json({ message: 'Invalid client_id: must be a valid UUID' });
    }

    next();
};