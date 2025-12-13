using System.Collections.Concurrent;

namespace NeloFMS.API.Services
{
    /// <summary>
    /// Service that proxies and caches vehicle data to handle optional fields and provide latest values
    /// </summary>
    public class VehicleDataProxyService
    {
        private readonly ConcurrentDictionary<string, UnitDataCache> _unitCaches = new();
        private readonly int _maxRecordsPerUnit;
        private readonly ILogger<VehicleDataProxyService> _logger;

        public VehicleDataProxyService(ILogger<VehicleDataProxyService> logger, int maxRecordsPerUnit = 50)
        {
            _logger = logger;
            _maxRecordsPerUnit = maxRecordsPerUnit;
        }

        /// <summary>
        /// Add new data for a unit, filling in missing fields with latest known values
        /// </summary>
        public VehicleDataMessage AddData(VehicleDataMessage data)
        {
            var cache = _unitCaches.GetOrAdd(data.IMEI, _ => new UnitDataCache(_maxRecordsPerUnit));
            var enrichedData = cache.AddAndEnrich(data);
            
            _logger.LogDebug($"Added data for IMEI {data.IMEI}. Cache size: {cache.Count}");
            
            return enrichedData;
        }

        /// <summary>
        /// Get the latest data for a specific unit
        /// </summary>
        public VehicleDataMessage? GetLatestData(string imei)
        {
            if (_unitCaches.TryGetValue(imei, out var cache))
            {
                return cache.GetLatest();
            }
            return null;
        }

        /// <summary>
        /// Get historical data for a specific unit
        /// </summary>
        public IReadOnlyList<VehicleDataMessage> GetHistory(string imei, int count = 50)
        {
            if (_unitCaches.TryGetValue(imei, out var cache))
            {
                return cache.GetHistory(count);
            }
            return Array.Empty<VehicleDataMessage>();
        }

        /// <summary>
        /// Get all IMEIs that have cached data
        /// </summary>
        public IReadOnlyList<string> GetTrackedUnits()
        {
            return _unitCaches.Keys.ToList();
        }

        /// <summary>
        /// Clear cache for a specific unit
        /// </summary>
        public void ClearUnit(string imei)
        {
            _unitCaches.TryRemove(imei, out _);
            _logger.LogInformation($"Cleared cache for IMEI {imei}");
        }

        /// <summary>
        /// Clear all cached data
        /// </summary>
        public void ClearAll()
        {
            _unitCaches.Clear();
            _logger.LogInformation("Cleared all cached data");
        }

        private class UnitDataCache
        {
            private readonly LinkedList<VehicleDataMessage> _history = new();
            private readonly int _maxRecords;
            private readonly object _lock = new();
            private VehicleDataMessage? _latestComplete;

            public UnitDataCache(int maxRecords)
            {
                _maxRecords = maxRecords;
            }

            public int Count
            {
                get
                {
                    lock (_lock)
                    {
                        return _history.Count;
                    }
                }
            }

            public VehicleDataMessage AddAndEnrich(VehicleDataMessage newData)
            {
                lock (_lock)
                {
                    // Enrich the new data with latest known values for missing fields
                    var enrichedData = EnrichData(newData);

                    // Add to history
                    _history.AddFirst(enrichedData);

                    // Trim history if needed
                    while (_history.Count > _maxRecords)
                    {
                        _history.RemoveLast();
                    }

                    // Update the latest complete record for future enrichment
                    UpdateLatestComplete(enrichedData);

                    return enrichedData;
                }
            }

            public VehicleDataMessage? GetLatest()
            {
                lock (_lock)
                {
                    return _history.First?.Value;
                }
            }

            public IReadOnlyList<VehicleDataMessage> GetHistory(int count)
            {
                lock (_lock)
                {
                    return _history.Take(count).ToList();
                }
            }

            private VehicleDataMessage EnrichData(VehicleDataMessage newData)
            {
                // If no previous data, return as-is
                if (_latestComplete == null)
                {
                    return newData;
                }

                // Create enriched copy, filling in null fields with latest known values
                return new VehicleDataMessage
                {
                    IMEI = newData.IMEI,
                    Timestamp = newData.Timestamp,
                    RawPayload = newData.RawPayload,
                    Latitude = newData.Latitude ?? _latestComplete.Latitude,
                    Longitude = newData.Longitude ?? _latestComplete.Longitude,
                    Speed = newData.Speed ?? _latestComplete.Speed,
                    Heading = newData.Heading ?? _latestComplete.Heading,
                    Altitude = newData.Altitude ?? _latestComplete.Altitude,
                    Satellites = newData.Satellites ?? _latestComplete.Satellites,
                    HDOP = newData.HDOP ?? _latestComplete.HDOP,
                    BatteryVoltage = newData.BatteryVoltage ?? _latestComplete.BatteryVoltage,
                    Temperature = newData.Temperature ?? _latestComplete.Temperature,
                    Odometer = newData.Odometer ?? _latestComplete.Odometer,
                    Ignition = newData.Ignition ?? _latestComplete.Ignition,
                    EventCode = newData.EventCode ?? _latestComplete.EventCode,
                    Priority = newData.Priority ?? _latestComplete.Priority
                };
            }

            private void UpdateLatestComplete(VehicleDataMessage data)
            {
                // Update _latestComplete with any non-null values from the new data
                if (_latestComplete == null)
                {
                    _latestComplete = data;
                    return;
                }

                // Update each field if the new data has a value
                if (data.Latitude.HasValue) _latestComplete.Latitude = data.Latitude;
                if (data.Longitude.HasValue) _latestComplete.Longitude = data.Longitude;
                if (data.Speed.HasValue) _latestComplete.Speed = data.Speed;
                if (data.Heading.HasValue) _latestComplete.Heading = data.Heading;
                if (data.Altitude.HasValue) _latestComplete.Altitude = data.Altitude;
                if (data.Satellites.HasValue) _latestComplete.Satellites = data.Satellites;
                if (data.HDOP.HasValue) _latestComplete.HDOP = data.HDOP;
                if (data.BatteryVoltage.HasValue) _latestComplete.BatteryVoltage = data.BatteryVoltage;
                if (data.Temperature.HasValue) _latestComplete.Temperature = data.Temperature;
                if (data.Odometer.HasValue) _latestComplete.Odometer = data.Odometer;
                if (data.Ignition.HasValue) _latestComplete.Ignition = data.Ignition;
                if (data.EventCode.HasValue) _latestComplete.EventCode = data.EventCode;
                if (data.Priority.HasValue) _latestComplete.Priority = data.Priority;
                
                // Always update timestamp to latest
                _latestComplete.Timestamp = data.Timestamp;
            }
        }
    }
}
