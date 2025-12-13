using Microsoft.AspNetCore.Mvc;
using NeloFMS.API.Services;

namespace NeloFMS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TelemetryController : ControllerBase
    {
        private readonly InfluxService _influxService;

        public TelemetryController(InfluxService influxService)
        {
            _influxService = influxService;
        }

        // GET: api/telemetry/data?deviceId=123&field=speed&timespan=1h
        [HttpGet("data")]
        public async Task<ActionResult<IEnumerable<TelemetryPoint>>> GetTelemetryData(
            [FromQuery] string deviceId,
            [FromQuery] string field,
            [FromQuery] string timespan = "1h")
        {
            if (string.IsNullOrEmpty(deviceId))
            {
                return BadRequest("Device ID is required");
            }

            if (string.IsNullOrEmpty(field))
            {
                return BadRequest("Field is required");
            }

            try
            {
                var data = await _influxService.GetTelemetryData(deviceId, field, timespan);
                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching telemetry data", error = ex.Message });
            }
        }
    }
}
