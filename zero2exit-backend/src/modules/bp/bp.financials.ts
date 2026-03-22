export const FINANCIAL_INPUTS_SCHEMA = {
  revenueModel: ['saas_subscription', 'transaction_fee', 'services', 'marketplace', 'hardware'],
  fields: [
    { key: 'revenueModel', label: 'Revenue Model', type: 'select' },
    { key: 'pricePerCustomer', label: 'Price per customer/month (USD)', type: 'number' },
    { key: 'targetCustomersY1', label: 'Target paying customers — Year 1', type: 'number' },
    { key: 'targetCustomersY2', label: 'Target paying customers — Year 2', type: 'number' },
    { key: 'targetCustomersY3', label: 'Target paying customers — Year 3', type: 'number' },
    { key: 'monthlyCosts', label: 'Estimated monthly operating costs (USD)', type: 'number' },
    { key: 'cac', label: 'Estimated Customer Acquisition Cost (USD)', type: 'number' },
    { key: 'churnRate', label: 'Estimated monthly churn rate (%)', type: 'number' },
  ]
}
