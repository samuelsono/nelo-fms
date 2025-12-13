import apiClient from './api'
import type { VehicleDataMessage } from '../services/vehicleDataService'

export const vehicleDataApi = {
  // Get the latest data for a specific unit
  getLatestData: async (imei: string): Promise<VehicleDataMessage> => {
    const response = await apiClient.get(`/vehicledata/${imei}/latest`)
    return response.data
  },

  // Get historical data for a specific unit
  getHistory: async (imei: string, count: number = 50): Promise<VehicleDataMessage[]> => {
    const response = await apiClient.get(`/vehicledata/${imei}/history`, {
      params: { count }
    })
    return response.data
  },

  // Get all tracked units
  getTrackedUnits: async (): Promise<string[]> => {
    const response = await apiClient.get('/vehicledata/tracked-units')
    return response.data
  },

  // Clear cache for a specific unit
  clearCache: async (imei: string): Promise<void> => {
    await apiClient.delete(`/vehicledata/${imei}/cache`)
  }
}
