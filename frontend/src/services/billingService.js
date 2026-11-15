import api from './api';

export const billingService = {
  /**
   * Record a consultation payment and generate a receipt
   */
  async createPayment(data) {
    const response = await api.post('/billing/payments', data);
    return response.data;
  },

  /**
   * Search and list payment receipts
   */
  async searchPayments(params = {}) {
    const response = await api.get('/billing/payments', { params });
    return response.data;
  },

  /**
   * Get daily and monthly collections accounting summary
   */
  async getCollectionsSummary(date) {
    const response = await api.get('/billing/summary', { params: { date } });
    return response.data;
  },

  /**
   * Get payment history and balance for a specific visit
   */
  async getPaymentsByVisit(visitId) {
    const response = await api.get(`/billing/visit/${visitId}`);
    return response.data;
  },

  /**
   * Get payment details by payment ID
   */
  async getPaymentById(id) {
    const response = await api.get(`/billing/payments/${id}`);
    return response.data;
  },

  /**
   * Get printable receipt layout
   */
  async getPrintableReceipt(id) {
    const response = await api.get(`/billing/payments/${id}/print`);
    return response.data;
  },
};

export default billingService;
