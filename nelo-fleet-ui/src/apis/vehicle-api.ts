import apiClient from './api'

export interface Vehicle {
  id: string
  name: string
  plateNumber: string
  make?: string
  model?: string
  year?: number
  vin?: string
  color?: string
  status: string
  createdAt: string
  lastLocationUpdate?: string
  lastLatitude?: number
  lastLongitude?: number
  lastSpeed?: number
  fuelLevel?: number
  odometer?: number
  driver?: string
  tenantId: string
  trackingUnitId?: string
  tenant?: {
    id: string
    name: string
    contactEmail?: string
    contactPhone?: string
    address?: string
  }
  trackingUnit?: {
    id: string
    serialNumber: string
    imeiNumber?: string
    model?: string
    manufacturer?: string
    firmwareVersion?: string
    simCard?: {
      id: string
      msisdn: string
      imsi: string
      carrier?: string
    }
  }
}

export const vehicleApi = {
  // Get all vehicles
  getVehicles: async (): Promise<Vehicle[]> => {
    const response = await apiClient.get('/vehicles')
    return response.data
  },

  // Get vehicle by ID
  getVehicle: async (id: string): Promise<Vehicle> => {
    const response = await apiClient.get(`/vehicles/${id}`)
    return response.data
  },

  // Get vehicles by tenant
  getVehiclesByTenant: async (tenantId: string): Promise<Vehicle[]> => {
    const response = await apiClient.get(`/vehicles/tenant/${tenantId}`)
    return response.data
  },

  // Create new vehicle
  createVehicle: async (vehicle: Partial<Vehicle>): Promise<Vehicle> => {
    const response = await apiClient.post('/vehicles', vehicle)
    return response.data
  },

  // Update vehicle
  updateVehicle: async (id: string, vehicle: Partial<Vehicle>): Promise<void> => {
    await apiClient.put(`/vehicles/${id}`, vehicle)
  },

  // Delete vehicle
  deleteVehicle: async (id: string): Promise<void> => {
    await apiClient.delete(`/vehicles/${id}`)
  },

  // Update vehicle location
  updateVehicleLocation: async (id: string, location: {
    latitude: number
    longitude: number
    speed?: number
  }): Promise<void> => {
    await apiClient.patch(`/vehicles/${id}/location`, location)
  }
}