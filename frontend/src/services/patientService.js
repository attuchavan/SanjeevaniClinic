import api from './api';

export const patientService = {
  // Search or paginate patients
  searchPatients: async (query = '', page = 1, limit = 20) => {
    const response = await api.get('/patients', {
      params: { q: query, page, limit },
    });
    return response.data?.data || { patients: [], pagination: {} };
  },

  // Get patient by ID with full visit timeline
  getPatientById: async (id) => {
    const response = await api.get(`/patients/${id}`);
    return response.data?.data?.patient;
  },

  // Check duplicate by mobile
  checkDuplicateMobile: async (mobile) => {
    const response = await api.get('/patients/check-duplicate', {
      params: { mobile },
    });
    return response.data;
  },

  // Register new patient
  createPatient: async (patientData) => {
    const response = await api.post('/patients', patientData);
    return response.data?.data?.patient;
  },

  // Update demographics
  updatePatient: async (id, updateData) => {
    const response = await api.put(`/patients/${id}`, updateData);
    return response.data?.data?.patient;
  },
};

export default patientService;
