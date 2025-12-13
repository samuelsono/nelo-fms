import { useState, useEffect, useRef, useCallback } from 'react'
import { vehicleDataService } from '../services/vehicleDataService'
import { type VehicleDataMessage } from '../services/vehicleDataService'
import { vehicleDataApi } from '../apis/vehicle-data-api'
import { useUserStore } from '../store/userStore'

interface UseVehicleDataOptions {
  maxDataPoints?: number
  imei?: string
  pollInterval?: number // in milliseconds
}

export function useVehicleData(options: UseVehicleDataOptions | number = {}) {
  // Support legacy number parameter for maxDataPoints
  const {
    maxDataPoints = 100,
    imei,
    pollInterval = 10000 // 10 seconds default
  } = typeof options === 'number' ? { maxDataPoints: options } : options

  const [isConnected, setIsConnected] = useState(false)
  const [connectionState, setConnectionState] = useState('Disconnected')
  const [latestData, setLatestData] = useState<VehicleDataMessage | null>(null)
  const [vehicleData, setVehicleData] = useState<VehicleDataMessage[]>([])
  const [isFetchingCache, setIsFetchingCache] = useState(false)
  
  const { user } = useUserStore()
  const reconnectTimeoutRef = useRef<number | undefined>(undefined)
  const pollIntervalRef = useRef<number | undefined>(undefined)

  const handleVehicleData = useCallback((data: VehicleDataMessage) => {
    setLatestData(data)
    setVehicleData(prev => {
      const newData = [data, ...prev]
      return newData.slice(0, maxDataPoints)
    })
  }, [maxDataPoints])

  const handleConnectionStateChange = useCallback((state: string) => {
    setConnectionState(state)
    setIsConnected(state === 'Connected')
  }, [])

  const connect = useCallback(async () => {
    if (!user?.token) {
      console.error('Cannot connect: No authentication token')
      return
    }

    try {
      await vehicleDataService.connect()
    } catch (error) {
      console.error('Failed to connect to vehicle data service:', error)
      throw error
    }
  }, [user?.token])

  const disconnect = useCallback(async () => {
    try {
      await vehicleDataService.disconnect()
    } catch (error) {
      console.error('Failed to disconnect from vehicle data service:', error)
    }
  }, [])

  const joinDeviceGroup = useCallback(async (imei: string) => {
    try {
      await vehicleDataService.joinDeviceGroup(imei)
    } catch (error) {
      console.error(`Failed to join device group ${imei}:`, error)
      throw error
    }
  }, [])

  const leaveDeviceGroup = useCallback(async (imei: string) => {
    try {
      await vehicleDataService.leaveDeviceGroup(imei)
    } catch (error) {
      console.error(`Failed to leave device group ${imei}:`, error)
      throw error
    }
  }, [])

  const clearData = useCallback(() => {
    setVehicleData([])
    setLatestData(null)
  }, [])

  const setInitialData = useCallback((data: VehicleDataMessage[]) => {
    setVehicleData(data.slice(0, maxDataPoints))
    if (data.length > 0) {
      setLatestData(data[0])
    }
  }, [maxDataPoints])

  const loadCachedData = useCallback(async (deviceImei: string) => {
    try {
      setIsFetchingCache(true)
      const history = await vehicleDataApi.getHistory(deviceImei, maxDataPoints)
      if (history && history.length > 0) {
        setInitialData(history)
      }
    } catch (error) {
      console.log('No cached data available for IMEI:', deviceImei)
    } finally {
      setIsFetchingCache(false)
    }
  }, [maxDataPoints, setInitialData])

  // Load initial cached data and set up polling when IMEI is provided
  useEffect(() => {
    if (!imei) return

    // Load initial data
    loadCachedData(imei)

    // Set up polling interval
    pollIntervalRef.current = window.setInterval(() => {
      loadCachedData(imei)
    }, pollInterval)

    // Cleanup
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [imei, pollInterval, loadCachedData])

  useEffect(() => {
    // Set up event listeners
    vehicleDataService.on('connected', () => {
      handleConnectionStateChange('Connected')
    })

    vehicleDataService.on('disconnected', () => {
      handleConnectionStateChange('Disconnected')
    })

    vehicleDataService.on('reconnecting', () => {
      handleConnectionStateChange('Reconnecting')
    })

    vehicleDataService.on('reconnected', () => {
      handleConnectionStateChange('Connected')
    })

    vehicleDataService.on('vehicleData', handleVehicleData)
    vehicleDataService.on('deviceData', handleVehicleData)

    // Update initial connection state
    setIsConnected(vehicleDataService.isConnected)
    setConnectionState(vehicleDataService.connectionState)

    // Auto-connect if user is authenticated
    if (user?.token && !vehicleDataService.isConnected) {
      connect().catch(console.error)
    }

    // Cleanup function
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [user?.token, connect, handleVehicleData, handleConnectionStateChange])

  // Disconnect when user logs out
  useEffect(() => {
    if (!user?.token && vehicleDataService.isConnected) {
      disconnect().catch(console.error)
    }
  }, [user?.token, disconnect])

  return {
    isConnected,
    connectionState,
    latestData,
    vehicleData,
    isFetchingCache,
    connect,
    disconnect,
    joinDeviceGroup,
    leaveDeviceGroup,
    clearData,
    setInitialData,
    loadCachedData
  }
}