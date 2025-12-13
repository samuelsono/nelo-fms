using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using NeloFMS.API.Services;
using Microsoft.EntityFrameworkCore;
using NeloFMS.API.Models;

namespace NeloFMS.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class VehicleEventsController : ControllerBase
    {
        private readonly InfluxService _influxService;
        private readonly AppDbContext _context;
        private readonly ILogger<VehicleEventsController> _logger;

        public VehicleEventsController(
            InfluxService influxService,
            AppDbContext context,
            ILogger<VehicleEventsController> logger)
        {
            _influxService = influxService;
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Get events by IMEI
        /// </summary>
        [HttpGet("imei/{imei}")]
        public async Task<ActionResult<List<VehicleEvent>>> GetEventsByImei(
            string imei,
            [FromQuery] string timespan = "7d",
            [FromQuery] int limit = 100)
        {
            try
            {
                if (limit < 1 || limit > 500)
                {
                    return BadRequest(new { message = "Limit must be between 1 and 500" });
                }

                var events = await _influxService.GetVehicleEventsAsync(imei, timespan, limit);
                return Ok(events);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving events for IMEI {imei}");
                return StatusCode(500, new { message = "Error retrieving vehicle events" });
            }
        }

        /// <summary>
        /// Get events by vehicle ID (finds linked tracking unit)
        /// </summary>
        [HttpGet("vehicle/{vehicleId}")]
        public async Task<ActionResult<List<VehicleEvent>>> GetEventsByVehicle(
            string vehicleId,
            [FromQuery] string timespan = "7d",
            [FromQuery] int limit = 100)
        {
            try
            {
                if (limit < 1 || limit > 500)
                {
                    return BadRequest(new { message = "Limit must be between 1 and 500" });
                }

                // Find the vehicle and its linked tracking unit
                var vehicle = await _context.Vehicles
                    .Include(v => v.TrackingUnit)
                    .FirstOrDefaultAsync(v => v.Id == vehicleId);

                if (vehicle == null)
                {
                    return NotFound(new { message = $"Vehicle {vehicleId} not found" });
                }

                if (vehicle.TrackingUnit == null || string.IsNullOrEmpty(vehicle.TrackingUnit.ImeiNumber))
                {
                    return NotFound(new { message = $"No tracking unit linked to vehicle {vehicleId}" });
                }

                var events = await _influxService.GetVehicleEventsAsync(
                    vehicle.TrackingUnit.ImeiNumber, 
                    timespan, 
                    limit);
                
                return Ok(events);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving events for vehicle {vehicleId}");
                return StatusCode(500, new { message = "Error retrieving vehicle events" });
            }
        }

        /// <summary>
        /// Get events by tracking unit ID
        /// </summary>
        [HttpGet("unit/{unitId}")]
        public async Task<ActionResult<List<VehicleEvent>>> GetEventsByUnit(
            string unitId,
            [FromQuery] string timespan = "7d",
            [FromQuery] int limit = 100)
        {
            try
            {
                if (limit < 1 || limit > 500)
                {
                    return BadRequest(new { message = "Limit must be between 1 and 500" });
                }

                // Find the tracking unit
                var unit = await _context.TrackingUnits
                    .FirstOrDefaultAsync(u => u.Id == unitId);

                if (unit == null)
                {
                    return NotFound(new { message = $"Tracking unit {unitId} not found" });
                }

                if (string.IsNullOrEmpty(unit.ImeiNumber))
                {
                    return BadRequest(new { message = "Tracking unit has no IMEI number" });
                }

                var events = await _influxService.GetVehicleEventsAsync(
                    unit.ImeiNumber, 
                    timespan, 
                    limit);
                
                return Ok(events);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving events for unit {unitId}");
                return StatusCode(500, new { message = "Error retrieving vehicle events" });
            }
        }
    }
}
