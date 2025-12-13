import apiClient from './api'

export interface TrackingUnit {
  id: string
  imeiNumber: string
  serialNumber: string
  model?: string
  manufacturer?: string
  firmwareVersion?: string
  createdAt: string
  lastCommunication?: string
  isActive: boolean
  vehicleId?: string
  vehicle?: {
    id: string
    name: string
    plateNumber: string
  }
  simCard?: {
    id: string
    msisdn: string
    carrier?: string
    isActive: boolean
  }
}

export const trackingUnitApi = {
  // Get all tracking units
  getTrackingUnits: async (): Promise<TrackingUnit[]> => {
    const response = await apiClient.get('/trackingunits')
    return response.data
  },

  // Get single tracking unit
  getTrackingUnit: async (id: string): Promise<TrackingUnit> => {
    const response = await apiClient.get(`/trackingunits/${id}`)
    return response.data
  },

  // Create new tracking unit
  createTrackingUnit: async (trackingUnit: Partial<TrackingUnit>): Promise<TrackingUnit> => {
    const response = await apiClient.post('/trackingunits', trackingUnit)
    return response.data
  },

  // Update tracking unit
  updateTrackingUnit: async (id: string, trackingUnit: Partial<TrackingUnit>): Promise<TrackingUnit> => {
    const response = await apiClient.put(`/trackingunits/${id}`, trackingUnit)
    return response.data
  },

  // Delete tracking unit
  deleteTrackingUnit: async (id: string): Promise<void> => {
    await apiClient.delete(`/trackingunits/${id}`)
  },

  // Assign tracking unit to vehicle
  assignToVehicle: async (trackingUnitId: string, vehicleId: string): Promise<TrackingUnit> => {
    const response = await apiClient.post(`/trackingunits/${trackingUnitId}/assign-vehicle`, { vehicleId })
    return response.data
  },

  // Unassign tracking unit from vehicle
  unassignFromVehicle: async (trackingUnitId: string): Promise<TrackingUnit> => {
    const response = await apiClient.post(`/trackingunits/${trackingUnitId}/unassign-vehicle`)
    return response.data
  }
}
