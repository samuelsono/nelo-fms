using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using NeloFMS.API.Services;

namespace NeloFMS.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class VehicleDataController : ControllerBase
    {
        private readonly VehicleDataProxyService _proxyService;
        private readonly InfluxService _influxService;
        private readonly ILogger<VehicleDataController> _logger;

        public VehicleDataController(
            VehicleDataProxyService proxyService,
            InfluxService influxService,
            ILogger<VehicleDataController> logger)
        {
            _proxyService = proxyService;
            _influxService = influxService;
            _logger = logger;
        }

        /// <summary>
        /// Get the latest data for a specific unit
        /// </summary>
        [HttpGet("{imei}/latest")]
        public async Task<ActionResult<VehicleDataMessage>> GetLatest(string imei)
        {
            // Try memory cache first
            var data = _proxyService.GetLatestData(imei);
            
            // If not in cache, try InfluxDB
            if (data == null)
            {
                data = await _influxService.GetLatestVehicleDataAsync(imei);
            }
            
            if (data == null)
            {
                return NotFound(new { message = $"No data found for IMEI {imei}" });
            }
            return Ok(data);
        }

        /// <summary>
        /// Get historical data for a specific unit
        /// </summary>
        [HttpGet("{imei}/history")]
        public async Task<ActionResult<IReadOnlyList<VehicleDataMessage>>> GetHistory(
            string imei, 
            [FromQuery] int count = 50)
        {
            if (count < 1 || count > 100)
            {
                return BadRequest(new { message = "Count must be between 1 and 100" });
            }

            // Try memory cache first
            var history = _proxyService.GetHistory(imei, count);
            
            // If not in cache or not enough data, try InfluxDB
            if (history.Count == 0)
            {
                history = await _influxService.GetVehicleDataHistoryAsync(imei, count);
            }
            
            return Ok(history);
        }

        /// <summary>
        /// Get all tracked units
        /// </summary>
        [HttpGet("tracked-units")]
        public ActionResult<IReadOnlyList<string>> GetTrackedUnits()
        {
            var units = _proxyService.GetTrackedUnits();
            return Ok(units);
        }

        /// <summary>
        /// Clear cache for a specific unit
        /// </summary>
        [HttpDelete("{imei}/cache")]
        public IActionResult ClearCache(string imei)
        {
            _proxyService.ClearUnit(imei);
            return NoContent();
        }
    }
}
