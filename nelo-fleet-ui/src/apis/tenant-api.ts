import apiClient from './api'

export interface Tenant {
  id: string
  name: string
  contactEmail?: string
  contactPhone?: string
  address?: string
  createdAt: string
  isActive: boolean
  vehicleCount?: number
}

export const tenantApi = {
  // Get all tenants
  getTenants: async (): Promise<Tenant[]> => {
    const response = await apiClient.get('/tenants')
    return response.data
  },

  // Get single tenant
  getTenant: async (id: string): Promise<Tenant> => {
    const response = await apiClient.get(`/tenants/${id}`)
    return response.data
  },

  // Create new tenant
  createTenant: async (tenant: Partial<Tenant>): Promise<Tenant> => {
    const response = await apiClient.post('/tenants', tenant)
    return response.data
  },

  // Update tenant
  updateTenant: async (id: string, tenant: Partial<Tenant>): Promise<Tenant> => {
    const response = await apiClient.put(`/tenants/${id}`, tenant)
    return response.data
  },

  // Delete tenant
  deleteTenant: async (id: string): Promise<void> => {
    await apiClient.delete(`/tenants/${id}`)
  },

  // Get tenant statistics
  getTenantStats: async (id: string): Promise<any> => {
    const response = await apiClient.get(`/tenants/${id}/stats`)
    return response.data
  }
}
