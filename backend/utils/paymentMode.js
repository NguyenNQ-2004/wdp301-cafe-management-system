const demoPaymentsEnabled = () => process.env.PAYMENT_DEMO_ENABLED === 'true' && process.env.NODE_ENV !== 'production';

module.exports = { demoPaymentsEnabled };
