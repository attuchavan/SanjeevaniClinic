import api from './api';

export const queueService = {
  // Get live queue and summary metrics
  getTodayQueue: async (date) => {
    const response = await api.get('/queue', { params: { date } });
    return response.data?.data || { summary: {}, activeQueue: [], completedQueue: [] };
  },

  // Create walk-in visit / dispatch token
  createVisit: async (visitData) => {
    const response = await api.post('/queue/visit', visitData);
    return response.data?.data?.visit;
  },

  // Doctor calls next waiting patient
  callNextPatient: async () => {
    const response = await api.post('/queue/call-next');
    return response.data?.data?.visit;
  },

  // Update status or priority (WAITING, CALLED, IN_PROGRESS, COMPLETED, CANCELLED)
  updateVisitStatus: async (visitId, statusData) => {
    const response = await api.patch(`/queue/visit/${visitId}/status`, statusData);
    return response.data?.data?.visit;
  },
};

export default queueService;
