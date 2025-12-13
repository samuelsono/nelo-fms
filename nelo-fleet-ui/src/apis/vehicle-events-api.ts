import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5108'

export interface VehicleEvent {
  timestamp: string
  imei: string
  eventType: string
  eventCode?: number
  latitude?: number
  longitude?: number
  speed?: number
  description?: string
}

export const vehicleEventsApi = {
  getEventsByImei: async (imei: string, timespan: string = '7d', limit: number = 100): Promise<VehicleEvent[]> => {
    const response = await axios.get(`${API_BASE_URL}/api/VehicleEvents/imei/${imei}`, {
      params: { timespan, limit }
    })
    return response.data
  },

  getEventsByVehicle: async (vehicleId: string, timespan: string = '7d', limit: number = 100): Promise<VehicleEvent[]> => {
    const response = await axios.get(`${API_BASE_URL}/api/VehicleEvents/vehicle/${vehicleId}`, {
      params: { timespan, limit }
    })
    return response.data
  },

  getEventsByUnit: async (unitId: string, timespan: string = '7d', limit: number = 100): Promise<VehicleEvent[]> => {
    const response = await axios.get(`${API_BASE_URL}/api/VehicleEvents/unit/${unitId}`, {
      params: { timespan, limit }
    })
    return response.data
  }
}
