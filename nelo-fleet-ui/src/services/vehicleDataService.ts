import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { useUserStore } from '../store/userStore'

export interface VehicleDataMessage {
  imei: string
  timestamp: string
  rawPayload?: string
  latitude?: number
  longitude?: number
  speed?: number
  heading?: number
  altitude?: number
  satellites?: number
  hdop?: number
  batteryVoltage?: number
  unitBatteryVoltage?: number
  temperature?: number
  odometer?: number
  mileage?: number
  ignition?: boolean
  eventCode?: number
  priority?: number
  rpm?: number
  distance?: number
  movement?: boolean
  [key: string]: any // Allow additional properties
}

class VehicleDataService {
  private connection: HubConnection | null = null
  private listeners: Map<string, Function[]> = new Map()
  private reconnectInterval: number = 5000
  private maxReconnectAttempts: number = 10
  private _isConnected: boolean = false
  private _connectionState: string = 'Disconnected'

  constructor() {
    this.initializeListenerMaps()
  }

  private initializeListenerMaps() {
    this.listeners.set('connected', [])
    this.listeners.set('disconnected', [])
    this.listeners.set('reconnecting', [])
    this.listeners.set('reconnected', [])
    this.listeners.set('vehicleData', [])
    this.listeners.set('deviceData', [])
  }

  private buildConnection(): HubConnection {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5108'
    console.log('SignalR connecting to:', `${baseUrl}/vehicleDataHub`)

    return new HubConnectionBuilder()
      .withUrl(`${baseUrl}/vehicleDataHub`, {
        accessTokenFactory: () => {
          // Always get fresh token from store (important for reconnections)
          const { user } = useUserStore.getState()
          if (!user?.token) {
            throw new Error('No authentication token available')
          }
          return user.token
        },
        withCredentials: false
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          if (retryContext.previousRetryCount < this.maxReconnectAttempts) {
            return this.reconnectInterval
          }
          return null // Stop reconnecting
        }
      })
      .configureLogging(LogLevel.Information)
      .build()
  }

  private setupConnectionEventHandlers() {
    if (!this.connection) return

    this.connection.onclose((error) => {
      console.log('SignalR connection closed:', error)
      this._isConnected = false
      this._connectionState = 'Disconnected'
      
      // If closed due to auth error, clear connection to force full rebuild
      if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
        console.warn('Connection closed due to authentication error. Clearing connection.')
        this.connection = null
      }
      
      this.emit('disconnected')
    })

    this.connection.onreconnecting((error) => {
      console.log('SignalR reconnecting:', error)
      this._connectionState = 'Reconnecting'
      this.emit('reconnecting')
    })

    this.connection.onreconnected((connectionId) => {
      console.log('SignalR reconnected:', connectionId)
      this._isConnected = true
      this._connectionState = 'Connected'
      this.emit('reconnected')
    })

    // Set up message handlers
    this.connection.on('VehicleDataReceived', (data: VehicleDataMessage) => {
      console.log('Received vehicle data:', data)
      this.emit('vehicleData', data)
    })

    this.connection.on('DeviceDataReceived', (data: VehicleDataMessage) => {
      console.log('Received device data:', data)
      this.emit('deviceData', data)
    })
  }

  async connect(): Promise<void> {
    try {
      if (this._isConnected) {
        console.log('Already connected to SignalR hub')
        return
      }

      console.log('Connecting to SignalR hub...')
      this.connection = this.buildConnection()
      this.setupConnectionEventHandlers()

      await this.connection.start()
      
      this._isConnected = true
      this._connectionState = 'Connected'

      console.log('Successfully connected to SignalR hub')
      this.emit('connected')

    } catch (error: any) {
      console.error('Failed to connect to SignalR hub:', error)
      this._isConnected = false
      this._connectionState = 'Disconnected'
      
      // Provide better error message for authentication issues
      if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
        throw new Error('Authentication required. Please login first before connecting to live data.')
      }
      
      throw error
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.connection) {
        console.log('Disconnecting from SignalR hub...')
        await this.connection.stop()
        this.connection = null
      }

      this._isConnected = false
      this._connectionState = 'Disconnected'

      console.log('Disconnected from SignalR hub')

    } catch (error) {
      console.error('Error disconnecting from SignalR hub:', error)
      throw error
    }
  }

  async joinDeviceGroup(imei: string): Promise<void> {
    if (!this.connection || !this._isConnected) {
      throw new Error('Not connected to SignalR hub')
    }

    try {
      console.log(`Joining device group: ${imei}`)
      await this.connection.invoke('JoinDeviceGroup', imei)
      console.log(`Successfully joined device group: ${imei}`)
    } catch (error) {
      console.error(`Failed to join device group ${imei}:`, error)
      throw error
    }
  }

  async leaveDeviceGroup(imei: string): Promise<void> {
    if (!this.connection || !this._isConnected) {
      throw new Error('Not connected to SignalR hub')
    }

    try {
      console.log(`Leaving device group: ${imei}`)
      await this.connection.invoke('LeaveDeviceGroup', imei)
      console.log(`Successfully left device group: ${imei}`)
    } catch (error) {
      console.error(`Failed to leave device group ${imei}:`, error)
      throw error
    }
  }

  // Event system
  on(event: string, callback: Function) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.push(callback)
    }
  }

  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  private emit(event: string, data?: any) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error in event callback for '${event}':`, error)
        }
      })
    }
  }

  // Getters
  get isConnected(): boolean {
    return this._isConnected
  }

  get connectionState(): string {
    return this._connectionState
  }

  get connectionId(): string | null {
    return this.connection?.connectionId || null
  }
}

// Export singleton instance
export const vehicleDataService = new VehicleDataService()