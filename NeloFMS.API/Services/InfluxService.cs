using InfluxDB.Client;
using InfluxDB.Client.Api.Domain;
using InfluxDB.Client.Writes;
namespace NeloFMS.API.Services;

public class TelemetryPoint
{
    public DateTime Time { get; set; }
    public double Value { get; set; }
}

public class VehicleEvent
{
    public DateTime Timestamp { get; set; }
    public string IMEI { get; set; } = string.Empty;
    public string EventType { get; set; } = string.Empty;
    public int? EventCode { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public double? Speed { get; set; }
    public string? Description { get; set; }
}

public class InfluxService
{
    private readonly InfluxDBClient _client;
    private readonly string _bucket;
    private readonly string _org;
    private readonly ILogger<InfluxService> _logger;

    public InfluxService(IConfiguration config, ILogger<InfluxService> logger)
    {
        var url = config["InfluxDB:Url"] ?? "http://localhost:8086";
        var token = config["InfluxDB:Token"] ?? throw new InvalidOperationException("InfluxDB Token not configured");
        _bucket = config["InfluxDB:Bucket"] ?? "nelotec";
        _org = config["InfluxDB:Org"] ?? "Nelotec";
        _logger = logger;
        
        _client = new InfluxDBClient(url, token);
    }

    public async Task<List<TelemetryPoint>> GetTelemetryData(string deviceId, string field, string timespan = "1h")
    {
        var flux = $@"
from(bucket: ""{_bucket}"")
  |> range(start: -{timespan})
  |> filter(fn: (r) => r.topic == ""{deviceId}/data"")
  |> filter(fn: (r) => r[""_field""] == ""{field}"")
";

        var tables = await _client
            .GetQueryApi()
            .QueryAsync(flux, _org);

        return tables
            .SelectMany(t => t.Records)
            .Select(r => new TelemetryPoint
            {
                Time = r.GetTimeInDateTime() ?? DateTime.UtcNow,
                Value = Convert.ToDouble(r.GetValue())
            })
            .ToList();
    }

    /// <summary>
    /// Write vehicle data to InfluxDB
    /// </summary>
    public async Task WriteVehicleDataAsync(VehicleDataMessage data)
    {
        try
        {
            var writeApi = _client.GetWriteApiAsync();
            var point = PointData
                .Measurement("vehicle_data")
                .Tag("imei", data.IMEI)
                .Tag("topic", $"{data.IMEI}/data")
                .Timestamp(data.Timestamp, WritePrecision.Ms);

            // Add fields that have values
            if (data.Latitude.HasValue) point = point.Field("latitude", data.Latitude.Value);
            if (data.Longitude.HasValue) point = point.Field("longitude", data.Longitude.Value);
            if (data.Speed.HasValue) point = point.Field("speed", data.Speed.Value);
            if (data.Heading.HasValue) point = point.Field("heading", data.Heading.Value);
            if (data.Altitude.HasValue) point = point.Field("altitude", data.Altitude.Value);
            if (data.Satellites.HasValue) point = point.Field("satellites", data.Satellites.Value);
            if (data.HDOP.HasValue) point = point.Field("hdop", data.HDOP.Value);
            if (data.BatteryVoltage.HasValue) point = point.Field("batteryVoltage", data.BatteryVoltage.Value);
            if (data.UnitBatteryVoltage.HasValue) point = point.Field("unitBatteryVoltage", data.UnitBatteryVoltage.Value);
            if (data.Temperature.HasValue) point = point.Field("temperature", data.Temperature.Value);
            if (data.Odometer.HasValue) point = point.Field("odometer", data.Odometer.Value);
            if (data.Ignition.HasValue) point = point.Field("ignition", data.Ignition.Value ? 1 : 0);
            if (data.Movement.HasValue) point = point.Field("movement", data.Movement.Value ? 1 : 0);
            if (data.EventCode.HasValue) point = point.Field("eventCode", data.EventCode.Value);
            if (data.Priority.HasValue) point = point.Field("priority", data.Priority.Value);
            if (data.RPM.HasValue) point = point.Field("rpm", data.RPM.Value);
            if (data.Distance.HasValue) point = point.Field("distance", data.Distance.Value);

            await writeApi.WritePointAsync(point, _bucket, _org);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error writing vehicle data to InfluxDB for IMEI {data.IMEI}");
        }
    }

    /// <summary>
    /// Get latest vehicle data from InfluxDB
    /// </summary>
    public async Task<VehicleDataMessage?> GetLatestVehicleDataAsync(string imei)
    {
        try
        {
            var flux = $@"
from(bucket: ""{_bucket}"")
  |> range(start: -24h)
  |> filter(fn: (r) => r._measurement == ""vehicle_data"")
  |> filter(fn: (r) => r.imei == ""{imei}"")
  |> last()
  |> pivot(rowKey:[""_time""], columnKey: [""_field""], valueColumn: ""_value"")
";

            var tables = await _client.GetQueryApi().QueryAsync(flux, _org);
            var record = tables.FirstOrDefault()?.Records.FirstOrDefault();
            
            if (record == null) return null;

            return new VehicleDataMessage
            {
                IMEI = imei,
                Timestamp = record.GetTimeInDateTime() ?? DateTime.UtcNow,
                Latitude = GetDoubleValue(record, "latitude"),
                Longitude = GetDoubleValue(record, "longitude"),
                Speed = GetDoubleValue(record, "speed"),
                Heading = GetDoubleValue(record, "heading"),
                Altitude = GetDoubleValue(record, "altitude"),
                Satellites = GetIntValue(record, "satellites"),
                HDOP = GetDoubleValue(record, "hdop"),
                BatteryVoltage = GetDoubleValue(record, "batteryVoltage"),
                UnitBatteryVoltage = GetDoubleValue(record, "unitBatteryVoltage"),
                Temperature = GetDoubleValue(record, "temperature"),
                Odometer = GetDoubleValue(record, "odometer"),
                Ignition = GetBoolValue(record, "ignition"),
                Movement = GetBoolValue(record, "movement"),
                EventCode = GetIntValue(record, "eventCode"),
                Priority = GetIntValue(record, "priority"),
                RPM = GetDoubleValue(record, "rpm"),
                Distance = GetDoubleValue(record, "distance")
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error reading latest vehicle data from InfluxDB for IMEI {imei}");
            return null;
        }
    }

    /// <summary>
    /// Get historical vehicle data from InfluxDB
    /// </summary>
    public async Task<List<VehicleDataMessage>> GetVehicleDataHistoryAsync(string imei, int count = 50)
    {
        try
        {
            var flux = $@"
from(bucket: ""{_bucket}"")
  |> range(start: -24h)
  |> filter(fn: (r) => r._measurement == ""vehicle_data"")
  |> filter(fn: (r) => r.imei == ""{imei}"")
  |> pivot(rowKey:[""_time""], columnKey: [""_field""], valueColumn: ""_value"")
  |> sort(columns: [""_time""], desc: true)
  |> limit(n: {count})
";

            var tables = await _client.GetQueryApi().QueryAsync(flux, _org);
            var records = tables.SelectMany(t => t.Records).ToList();

            return records.Select(record => new VehicleDataMessage
            {
                IMEI = imei,
                Timestamp = record.GetTimeInDateTime() ?? DateTime.UtcNow,
                Latitude = GetDoubleValue(record, "latitude"),
                Longitude = GetDoubleValue(record, "longitude"),
                Speed = GetDoubleValue(record, "speed"),
                Heading = GetDoubleValue(record, "heading"),
                Altitude = GetDoubleValue(record, "altitude"),
                Satellites = GetIntValue(record, "satellites"),
                HDOP = GetDoubleValue(record, "hdop"),
                BatteryVoltage = GetDoubleValue(record, "batteryVoltage"),
                UnitBatteryVoltage = GetDoubleValue(record, "unitBatteryVoltage"),
                Temperature = GetDoubleValue(record, "temperature"),
                Odometer = GetDoubleValue(record, "odometer"),
                Ignition = GetBoolValue(record, "ignition"),
                Movement = GetBoolValue(record, "movement"),
                EventCode = GetIntValue(record, "eventCode"),
                Priority = GetIntValue(record, "priority"),
                RPM = GetDoubleValue(record, "rpm"),
                Distance = GetDoubleValue(record, "distance")
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error reading vehicle data history from InfluxDB for IMEI {imei}");
            return new List<VehicleDataMessage>();
        }
    }

    private double? GetDoubleValue(InfluxDB.Client.Core.Flux.Domain.FluxRecord record, string field)
    {
        try
        {
            var value = record.Values.GetValueOrDefault(field);
            return value != null ? Convert.ToDouble(value) : null;
        }
        catch { return null; }
    }

    private int? GetIntValue(InfluxDB.Client.Core.Flux.Domain.FluxRecord record, string field)
    {
        try
        {
            var value = record.Values.GetValueOrDefault(field);
            return value != null ? Convert.ToInt32(value) : null;
        }
        catch { return null; }
    }

    private bool? GetBoolValue(InfluxDB.Client.Core.Flux.Domain.FluxRecord record, string field)
    {
        try
        {
            var value = record.Values.GetValueOrDefault(field);
            if (value == null) return null;
            var intValue = Convert.ToInt32(value);
            return intValue > 0;
        }
        catch { return null; }
    }

    /// <summary>
    /// Get vehicle events from InfluxDB
    /// </summary>
    public async Task<List<VehicleEvent>> GetVehicleEventsAsync(string imei, string timespan = "7d", int limit = 100)
    {
        try
        {
            var flux = $@"
from(bucket: ""{_bucket}"")
  |> range(start: -{timespan})
  |> filter(fn: (r) => r._measurement == ""vehicle_data"")
  |> filter(fn: (r) => r.imei == ""{imei}"")
  |> filter(fn: (r) => r._field == ""eventCode"")
  |> filter(fn: (r) => r._value != 0)
  |> pivot(rowKey:[""_time""], columnKey: [""_field""], valueColumn: ""_value"")
  |> sort(columns: [""_time""], desc: true)
  |> limit(n: {limit})
";

            var tables = await _client.GetQueryApi().QueryAsync(flux, _org);
            var records = tables.SelectMany(t => t.Records).ToList();

            return records.Select(record => {
                var eventCode = GetIntValue(record, "eventCode");
                return new VehicleEvent
                {
                    Timestamp = record.GetTimeInDateTime() ?? DateTime.UtcNow,
                    IMEI = imei,
                    EventCode = eventCode,
                    EventType = GetEventType(eventCode),
                    Description = GetEventDescription(eventCode),
                    Latitude = GetDoubleValue(record, "latitude"),
                    Longitude = GetDoubleValue(record, "longitude"),
                    Speed = GetDoubleValue(record, "speed")
                };
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error reading vehicle events from InfluxDB for IMEI {imei}");
            return new List<VehicleEvent>();
        }
    }

    private string GetEventType(int? eventCode)
    {
        if (!eventCode.HasValue) return "Unknown";

        return eventCode.Value switch
        {
            1 => "TripStart",
            2 => "TripStop",
            3 => "IgnitionOn",
            4 => "IgnitionOff",
            5 => "HarshBraking",
            6 => "HarshAcceleration",
            7 => "HarshCornering",
            8 => "Overspeed",
            9 => "Idling",
            10 => "GeofenceEnter",
            11 => "GeofenceExit",
            12 => "PowerDisconnect",
            13 => "PowerReconnect",
            14 => "Towing",
            15 => "Crash",
            _ => "Unknown"
        };
    }

    private string GetEventDescription(int? eventCode)
    {
        if (!eventCode.HasValue) return "Unknown event";

        return eventCode.Value switch
        {
            1 => "Vehicle trip started",
            2 => "Vehicle trip ended",
            3 => "Ignition turned on",
            4 => "Ignition turned off",
            5 => "Harsh braking detected",
            6 => "Harsh acceleration detected",
            7 => "Harsh cornering detected",
            8 => "Vehicle exceeded speed limit",
            9 => "Vehicle idling for extended period",
            10 => "Vehicle entered geofence",
            11 => "Vehicle exited geofence",
            12 => "Power disconnected",
            13 => "Power reconnected",
            14 => "Vehicle towing detected",
            15 => "Crash or impact detected",
            _ => "Unknown event"
        };
    }
}
