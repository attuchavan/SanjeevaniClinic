import api from './api';

export const consultationService = {
  /**
   * Get complete workspace for a visit (Doctor only)
   */
  async getWorkspace(visitId) {
    const response = await api.get(`/consultation/visit/${visitId}`);
    return response.data;
  },

  /**
   * Save or update case paper notes, vitals, examination & diagnosis (Doctor only)
   */
  async saveCasePaper(visitId, data) {
    const response = await api.put(`/consultation/visit/${visitId}/case-paper`, data);
    return response.data;
  },

  /**
   * Save or finalize prescription with structured medicines (Doctor only)
   */
  async savePrescription(visitId, data) {
    const response = await api.put(`/consultation/visit/${visitId}/prescription`, data);
    return response.data;
  },

  /**
   * Fetch printable prescription layout (Doctor & Receptionist)
   */
  async getPrintablePrescription(visitId) {
    const response = await api.get(`/consultation/visit/${visitId}/prescription/print`);
    return response.data;
  },

  /**
   * Fetch printable case paper layout (Doctor & Receptionist)
   */
  async getPrintableCasePaper(visitId) {
    const response = await api.get(`/consultation/visit/${visitId}/case-paper/print`);
    return response.data;
  },

  /**
   * Search and list prescriptions in archive
   */
  async listPrescriptions(params = {}) {
    const response = await api.get('/consultation/prescriptions', { params });
    return response.data;
  },
};

export default consultationService;
