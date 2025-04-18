const db = require('../db');

const Payment = {
    validatePaymentMethod(value) {
        const allowedMethods = ['credit_card', 'paypal', 'bank_transfer', 'cash'];
        if (!allowedMethods.includes(value)) {
            throw new Error(`Invalid payment method. Allowed: ${allowedMethods.join(', ')}`);
        }
    },

    validateAmount(value) {
        if (parseFloat(value) <= 0) {
            throw new Error('Amount must be positive');
        }
    },

    async create(data) {
        const {
            project_id,
            payer_id,
            payee_id,
            amount,
            payment_method,
            status = 'completed'
        } = data;

        const query = `
            INSERT INTO payments (
                project_id, payer_id, payee_id, amount,
                payment_method, status, transaction_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `;

        const values = [
            project_id,
            payer_id,
            payee_id,
            parseFloat(amount),
            payment_method,
            status,
            `pay_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
        ];

        const { rows } = await db.query(query, values);
        return rows[0];
    },

    async findByUserId(user_id) {
        const query = `
            SELECT * FROM payments 
            WHERE payer_id = $1 OR payee_id = $1
            ORDER BY payment_date DESC
        `;
        const { rows } = await db.query(query, [user_id]);
        return rows;
    },

    async findByTransactionId(transaction_id) {
        const { rows } = await db.query('SELECT * FROM payments WHERE transaction_id = $1', [transaction_id]);
        return rows[0];
    },

    async findByContractId(contract_id) {
        const { rows } = await db.query('SELECT * FROM payments WHERE contract_id = $1', [contract_id]);
        return rows;
    },

    async findByPayerId(payer_id) {
        const { rows } = await db.query('SELECT * FROM payments WHERE payer_id = $1', [payer_id]);
        return rows;
    },

    async findByPayeeId(payee_id) {
        const { rows } = await db.query('SELECT * FROM payments WHERE payee_id = $1', [payee_id]);
        return rows;
    },

    async updateStatus(payment_id, status, transaction_id = null) {
        let query, values;

        if (transaction_id) {
            query = `
                UPDATE payments 
                SET status = $1, 
                    transaction_id = $2, 
                    payment_date = CASE 
                        WHEN $1 = 'completed' AND payment_date IS NULL THEN NOW() 
                        ELSE payment_date 
                    END
                WHERE payment_id = $3
                RETURNING *;
            `;
            values = [status, transaction_id, payment_id];
        } else {
            query = `
                UPDATE payments 
                SET status = $1, 
                    payment_date = CASE 
                        WHEN $1 = 'completed' AND payment_date IS NULL THEN NOW() 
                        ELSE payment_date 
                    END
                WHERE payment_id = $2
                RETURNING *;
            `;
            values = [status, payment_id];
        }

        const { rows } = await db.query(query, values);
        return rows[0];
    },

    async markAsFailed(payment_id, reason) {
        const query = `
            UPDATE payments 
            SET status = 'failed', 
                metadata = jsonb_set(
                    COALESCE(metadata, '{}'::jsonb), 
                    '{failure_reason}', 
                    $1::jsonb
                )
            WHERE payment_id = $2
            RETURNING *;
        `;
        const { rows } = await db.query(query, [JSON.stringify(reason), payment_id]);
        return rows[0];
    },

    async processRefund(payment_id, amount = null) {
        const payment = await this.findById(payment_id);
        if (!payment) throw new Error('Payment not found');
        if (payment.status !== 'completed') {
            throw new Error('Only completed payments can be refunded');
        }

        const refund_amount = amount || payment.amount;
        const query = `
            UPDATE payments 
            SET status = 'refunded', 
                metadata = jsonb_set(
                    jsonb_set(
                        COALESCE(metadata, '{}'::jsonb), 
                        '{refund_amount}', 
                        $1::jsonb
                    ), 
                    '{refund_date}', 
                    $2::jsonb
                )
            WHERE payment_id = $3
            RETURNING *;
        `;
        const { rows } = await db.query(query, [
            JSON.stringify(refund_amount),
            JSON.stringify(new Date().toISOString()),
            payment_id
        ]);
        return rows[0];
    },

    async getCompletedPayments(userId) {
        const query = `
            SELECT * FROM payments 
            WHERE status = 'completed' 
            AND (payer_id = $1 OR payee_id = $1)
        `;
        const { rows } = await db.query(query, [userId]);
        return rows;
    }
};

module.exports = Payment;
