using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NeloFMS.API.Models;
using NeloFMS.API.Services;

namespace NeloFMS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VehiclesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly VehicleDataProxyService _proxyService;
        private readonly InfluxService _influxService;
        private readonly ILogger<VehiclesController> _logger;

        public VehiclesController(
            AppDbContext context,
            VehicleDataProxyService proxyService,
            InfluxService influxService,
            ILogger<VehiclesController> logger)
        {
            _context = context;
            _proxyService = proxyService;
            _influxService = influxService;
            _logger = logger;
        }

        // GET: api/vehicles
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Vehicle>>> GetVehicles()
        {
            return await _context.Vehicles
                .Include(v => v.Tenant)
                .Include(v => v.TrackingUnit)
                    .ThenInclude(tu => tu!.SimCard)
                .ToListAsync();
        }

        // GET: api/vehicles/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<Vehicle>> GetVehicle(string id)
        {
            var vehicle = await _context.Vehicles
                .Include(v => v.Tenant)
                .Include(v => v.TrackingUnit)
                    .ThenInclude(tu => tu!.SimCard)
                .FirstOrDefaultAsync(v => v.Id == id);

            if (vehicle == null)
            {
                return NotFound();
            }

            return vehicle;
        }

        // GET: api/vehicles/tenant/{tenantId}
        [HttpGet("tenant/{tenantId}")]
        public async Task<ActionResult<IEnumerable<Vehicle>>> GetVehiclesByTenant(string tenantId)
        {
            return await _context.Vehicles
                .Include(v => v.Tenant)
                .Include(v => v.TrackingUnit)
                    .ThenInclude(tu => tu!.SimCard)
                .Where(v => v.TenantId == tenantId)
                .ToListAsync();
        }

        // GET: api/vehicles/map-data
        [HttpGet("map-data")]
        public async Task<ActionResult<IEnumerable<VehicleMapData>>> GetVehiclesMapData()
        {
            // Get all vehicles with their tracking units
            var vehicles = await _context.Vehicles
                .Include(v => v.TrackingUnit)
                .Where(v => v.TrackingUnit != null && v.TrackingUnit.ImeiNumber != null)
                .ToListAsync();

            var mapDataList = new List<VehicleMapData>();

            foreach (var vehicle in vehicles)
            {
                var imei = vehicle.TrackingUnit!.ImeiNumber;
                
                // Try to get latest data from proxy service (in-memory cache)
                var latestData = _proxyService.GetLatestData(imei);
                
                // If not in cache, try InfluxDB
                if (latestData == null)
                {
                    try
                    {
                        latestData = await _influxService.GetLatestVehicleDataAsync(imei);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning($"Could not fetch data for IMEI {imei}: {ex.Message}");
                    }
                }

                // Create map data object
                var mapData = new VehicleMapData
                {
                    Id = vehicle.Id,
                    Name = vehicle.Name,
                    PlateNumber = vehicle.PlateNumber,
                    Status = vehicle.Status,
                    ImeiNumber = imei
                };

                // Use telemetry data if available, otherwise fall back to vehicle's last known location
                if (latestData != null && latestData.Latitude.HasValue && latestData.Longitude.HasValue)
                {
                    mapData.Latitude = latestData.Latitude.Value;
                    mapData.Longitude = latestData.Longitude.Value;
                    mapData.Speed = latestData.Speed;
                    mapData.Heading = latestData.Heading;
                    mapData.LastUpdate = latestData.Timestamp;
                    mapData.Ignition = latestData.Ignition;
                    mapData.Satellites = latestData.Satellites;
                }
                else if (vehicle.LastLatitude.HasValue && vehicle.LastLongitude.HasValue)
                {
                    mapData.Latitude = vehicle.LastLatitude.Value;
                    mapData.Longitude = vehicle.LastLongitude.Value;
                    mapData.Speed = vehicle.LastSpeed;
                    mapData.LastUpdate = vehicle.LastLocationUpdate ?? vehicle.CreatedAt;
                }
                else
                {
                    // Skip vehicles without any location data
                    continue;
                }

                mapDataList.Add(mapData);
            }

            return Ok(mapDataList);
        }

        // POST: api/vehicles
        [HttpPost]
        public async Task<ActionResult<Vehicle>> CreateVehicle(Vehicle vehicle)
        {
            // Validate tenant exists
            var tenant = await _context.Tenants.FindAsync(vehicle.TenantId);
            if (tenant == null)
            {
                return BadRequest("Invalid tenant ID");
            }

            // Validate tracking unit if provided
            if (!string.IsNullOrEmpty(vehicle.TrackingUnitId))
            {
                var trackingUnit = await _context.TrackingUnits.FindAsync(vehicle.TrackingUnitId);
                if (trackingUnit == null)
                {
                    return BadRequest("Invalid tracking unit ID");
                }
            }

            vehicle.Id = Guid.NewGuid().ToString();
            vehicle.CreatedAt = DateTime.UtcNow;

            _context.Vehicles.Add(vehicle);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetVehicle), new { id = vehicle.Id }, vehicle);
        }

        // PUT: api/vehicles/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateVehicle(string id, Vehicle vehicle)
        {
            var existingVehicle = await _context.Vehicles.FindAsync(id);
            if (existingVehicle == null)
            {
                return NotFound();
            }

            // Validate tenant exists if provided
            if (!string.IsNullOrEmpty(vehicle.TenantId))
            {
                var tenant = await _context.Tenants.FindAsync(vehicle.TenantId);
                if (tenant == null)
                {
                    return BadRequest("Invalid tenant ID");
                }
                existingVehicle.TenantId = vehicle.TenantId;
            }

            // Update properties
            existingVehicle.Name = vehicle.Name;
            existingVehicle.PlateNumber = vehicle.PlateNumber;
            existingVehicle.Make = vehicle.Make;
            existingVehicle.Model = vehicle.Model;
            existingVehicle.Year = vehicle.Year;
            existingVehicle.VIN = vehicle.VIN;
            existingVehicle.Color = vehicle.Color;
            existingVehicle.Status = vehicle.Status;
            existingVehicle.Odometer = vehicle.Odometer;
            existingVehicle.Driver = vehicle.Driver;
            existingVehicle.FuelLevel = vehicle.FuelLevel;
            existingVehicle.TrackingUnitId = vehicle.TrackingUnitId;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!VehicleExists(id))
                {
                    return NotFound();
                }
                throw;
            }

            return NoContent();
        }

        // DELETE: api/vehicles/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteVehicle(string id)
        {
            var vehicle = await _context.Vehicles.FindAsync(id);
            if (vehicle == null)
            {
                return NotFound();
            }

            _context.Vehicles.Remove(vehicle);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // PATCH: api/vehicles/{id}/location
        [HttpPatch("{id}/location")]
        public async Task<IActionResult> UpdateLocation(string id, [FromBody] LocationUpdate locationUpdate)
        {
            var vehicle = await _context.Vehicles.FindAsync(id);
            if (vehicle == null)
            {
                return NotFound();
            }

            vehicle.LastLatitude = locationUpdate.Latitude;
            vehicle.LastLongitude = locationUpdate.Longitude;
            vehicle.LastSpeed = locationUpdate.Speed;
            vehicle.LastLocationUpdate = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        private bool VehicleExists(string id)
        {
            return _context.Vehicles.Any(e => e.Id == id);
        }
    }

    public class VehicleMapData
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string PlateNumber { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string ImeiNumber { get; set; } = string.Empty;
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public double? Speed { get; set; }
        public double? Heading { get; set; }
        public DateTime LastUpdate { get; set; }
        public bool? Ignition { get; set; }
        public int? Satellites { get; set; }
    }

    public class LocationUpdate
    {
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public double? Speed { get; set; }
    }
}
