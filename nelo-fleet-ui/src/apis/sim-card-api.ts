import apiClient from './api'

export interface SimCard {
  id: string
  msisdn: string
  imsi: string
  puk: string
  carrier?: string
  createdAt: string
  isActive: boolean
  trackingUnitId?: string
  trackingUnit?: {
    id: string
    imeiNumber: string
    serialNumber: string
    vehicle?: {
      id: string
      name: string
      plateNumber: string
    }
  }
}

export const simCardApi = {
  // Get all SIM cards
  getSimCards: async (): Promise<SimCard[]> => {
    const response = await apiClient.get('/sims')
    return response.data
  },

  // Get single SIM card
  getSimCard: async (id: string): Promise<SimCard> => {
    const response = await apiClient.get(`/sims/${id}`)
    return response.data
  },

  // Get SIM card by MSISDN
  getSimCardByMSISDN: async (msisdn: string): Promise<SimCard> => {
    const response = await apiClient.get(`/sims/msisdn/${msisdn}`)
    return response.data
  },

  // Get available SIM cards (not assigned to any tracking unit)
  getAvailableSimCards: async (): Promise<SimCard[]> => {
    const response = await apiClient.get('/sims/available')
    return response.data
  },

  // Get SIM cards by carrier
  getSimCardsByCarrier: async (carrier: string): Promise<SimCard[]> => {
    const response = await apiClient.get(`/sims/carrier/${carrier}`)
    return response.data
  },

  // Create new SIM card
  createSimCard: async (simCard: Partial<SimCard>): Promise<SimCard> => {
    const response = await apiClient.post('/sims', simCard)
    return response.data
  },

  // Update SIM card
  updateSimCard: async (id: string, simCard: Partial<SimCard>): Promise<SimCard> => {
    const response = await apiClient.put(`/sims/${id}`, { ...simCard, id })
    return response.data
  },

  // Delete SIM card
  deleteSimCard: async (id: string): Promise<void> => {
    await apiClient.delete(`/sims/${id}`)
  },

  // Assign SIM card to tracking unit
  assignToTrackingUnit: async (simCardId: string, trackingUnitId: string): Promise<SimCard> => {
    const response = await apiClient.post(`/sims/${simCardId}/assign-tracking-unit`, { trackingUnitId })
    return response.data
  },

  // Unassign SIM card from tracking unit
  unassignFromTrackingUnit: async (simCardId: string): Promise<SimCard> => {
    const response = await apiClient.post(`/sims/${simCardId}/unassign-tracking-unit`)
    return response.data
  }
}
