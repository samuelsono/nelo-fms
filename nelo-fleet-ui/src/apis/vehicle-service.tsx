export interface Vehicle {
  id: string
  name: string
  plateNumber: string
  status: 'active' | 'inactive' | 'maintenance'
  lastLocation?: string
  speed?: number
  fuel?: number
  driver?: string
}

const sampleVehicles: Vehicle[] = [
  {
    id: '1',
    name: 'Vehicle Alpha 3',
    plateNumber: 'ABC-1234',
    status: 'active',
    lastLocation: 'Downtown Hub',
    speed: 45,
    fuel: 85,
    driver: 'John Doe',
  },
  {
    id: '2',
    name: 'Vehicle Beta',
    plateNumber: 'XYZ-5678',
    status: 'active',
    lastLocation: 'Highway Route 5',
    speed: 72,
    fuel: 60,
    driver: 'Jane Smith',
  },
  {
    id: '3',
    name: 'Vehicle Gamma',
    plateNumber: 'DEF-9012',
    status: 'maintenance',
    lastLocation: 'Service Center',
    fuel: 0,
    driver: undefined,
  },
  {
    id: '4',
    name: 'Vehicle Delta',
    plateNumber: 'GHI-3456',
    status: 'inactive',
    lastLocation: 'Depot',
    fuel: 50,
  },
  {
    id: '5',
    name: 'Vehicle Epsilon',
    plateNumber: 'JKL-7890',
    status: 'active',
    lastLocation: 'City Center',
    speed: 35,
    fuel: 72,
    driver: 'Mike Johnson',
  },
]

export const getVehicles = async (): Promise<Vehicle[]> => {
  // Simulate API call delay
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(sampleVehicles)
    }, 500)
  })
}

export const getVehicleById = async (id: string): Promise<Vehicle | undefined> => {
  // Simulate API call delay
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(sampleVehicles.find((v) => v.id === id))
    }, 300)
  })
}
