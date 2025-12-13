import apiClient from './api'

export interface Driver {
  id: string
  firstName: string
  lastName: string
  fullName: string
  email?: string
  phone?: string
  licenseNumber: string
  licenseExpiry?: string
  dateOfBirth?: string
  address?: string
  emergencyContact?: string
  emergencyPhone?: string
  isActive: boolean
  createdAt: string
  tenantId: string
  tenant?: {
    id: string
    name: string
  }
  currentVehicle?: {
    id: string
    name: string
    plateNumber: string
  }
}

// Mock API service for drivers since there's no backend controller yet
export const driverApi = {
  // Get all drivers
  getDrivers: async (): Promise<Driver[]> => {
    // Mock data for now
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: '1',
            firstName: 'John',
            lastName: 'Smith',
            fullName: 'John Smith',
            email: 'john.smith@company.com',
            phone: '+1-555-0101',
            licenseNumber: 'DL123456789',
            licenseExpiry: '2026-06-15',
            dateOfBirth: '1985-03-20',
            address: '123 Main St, San Francisco, CA 94105',
            emergencyContact: 'Jane Smith',
            emergencyPhone: '+1-555-0102',
            isActive: true,
            createdAt: '2024-01-15T08:00:00Z',
            tenantId: '1',
            tenant: { id: '1', name: 'Fleet Corp' },
            currentVehicle: { id: '1', name: 'Fleet Truck 001', plateNumber: 'ABC-1234' }
          },
          {
            id: '2',
            firstName: 'Sarah',
            lastName: 'Johnson',
            fullName: 'Sarah Johnson',
            email: 'sarah.johnson@company.com',
            phone: '+1-555-0201',
            licenseNumber: 'DL987654321',
            licenseExpiry: '2025-11-30',
            dateOfBirth: '1990-07-12',
            address: '456 Oak Ave, San Francisco, CA 94110',
            emergencyContact: 'Mike Johnson',
            emergencyPhone: '+1-555-0202',
            isActive: true,
            createdAt: '2024-02-01T09:30:00Z',
            tenantId: '1',
            tenant: { id: '1', name: 'Fleet Corp' }
          },
          {
            id: '3',
            firstName: 'Mike',
            lastName: 'Wilson',
            fullName: 'Mike Wilson',
            email: 'mike.wilson@company.com',
            phone: '+1-555-0301',
            licenseNumber: 'DL456789123',
            licenseExpiry: '2027-02-28',
            dateOfBirth: '1988-11-05',
            address: '789 Pine St, San Francisco, CA 94102',
            emergencyContact: 'Lisa Wilson',
            emergencyPhone: '+1-555-0302',
            isActive: true,
            createdAt: '2024-01-20T14:15:00Z',
            tenantId: '2',
            tenant: { id: '2', name: 'Logistics Plus' },
            currentVehicle: { id: '3', name: 'Service Car 003', plateNumber: 'GHI-9012' }
          },
          {
            id: '4',
            firstName: 'Lisa',
            lastName: 'Brown',
            fullName: 'Lisa Brown',
            email: 'lisa.brown@company.com',
            phone: '+1-555-0401',
            licenseNumber: 'DL321654987',
            licenseExpiry: '2025-09-15',
            dateOfBirth: '1992-04-18',
            address: '321 Elm St, San Francisco, CA 94107',
            emergencyContact: 'Tom Brown',
            emergencyPhone: '+1-555-0402',
            isActive: false,
            createdAt: '2024-03-10T11:00:00Z',
            tenantId: '2',
            tenant: { id: '2', name: 'Logistics Plus' }
          },
          {
            id: '5',
            firstName: 'Tom',
            lastName: 'Davis',
            fullName: 'Tom Davis',
            email: 'tom.davis@company.com',
            phone: '+1-555-0501',
            licenseNumber: 'DL159753486',
            licenseExpiry: '2026-12-31',
            dateOfBirth: '1986-09-22',
            address: '654 Maple Dr, San Francisco, CA 94108',
            emergencyContact: 'Amy Davis',
            emergencyPhone: '+1-555-0502',
            isActive: true,
            createdAt: '2024-02-20T16:45:00Z',
            tenantId: '3',
            tenant: { id: '3', name: 'Transport Solutions' },
            currentVehicle: { id: '5', name: 'Company SUV 005', plateNumber: 'MNO-7890' }
          }
        ])
      }, 500)
    })
  },

  // Get single driver
  getDriver: async (id: string): Promise<Driver> => {
    const drivers = await driverApi.getDrivers()
    const driver = drivers.find(d => d.id === id)
    if (!driver) throw new Error('Driver not found')
    return driver
  },

  // Create new driver
  createDriver: async (driver: Partial<Driver>): Promise<Driver> => {
    // Mock implementation
    return { ...driver, id: Date.now().toString(), createdAt: new Date().toISOString() } as Driver
  },

  // Update driver
  updateDriver: async (id: string, driver: Partial<Driver>): Promise<Driver> => {
    // Mock implementation
    const existing = await driverApi.getDriver(id)
    return { ...existing, ...driver }
  },

  // Delete driver
  deleteDriver: async (id: string): Promise<void> => {
    // Mock implementation
    return Promise.resolve()
  }
}
