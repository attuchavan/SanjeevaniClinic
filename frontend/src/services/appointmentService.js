import api from './api';

export const appointmentService = {
  // List appointments
  getAppointments: async (params = {}) => {
    const response = await api.get('/appointments', { params });
    return response.data?.data?.appointments || [];
  },

  // Book appointment
  bookAppointment: async (appointmentData) => {
    const response = await api.post('/appointments', appointmentData);
    return response.data?.data?.appointment;
  },

  // Check in appointment -> converts to visit token
  checkInAppointment: async (appointmentId, priority = 'NORMAL') => {
    const response = await api.post(`/appointments/${appointmentId}/check-in`, { priority });
    return response.data?.data?.visit;
  },

  // Cancel appointment
  cancelAppointment: async (appointmentId, reason = '') => {
    const response = await api.patch(`/appointments/${appointmentId}/cancel`, { reason });
    return response.data?.data?.appointment;
  },
};

export default appointmentService;

