using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using NeloFMS.API.Services;

namespace NeloFMS.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class MqttController : ControllerBase
    {
        private readonly ILogger<MqttController> _logger;
        private readonly IHubContext<VehicleDataHub> _hubContext;

        public MqttController(
            ILogger<MqttController> logger,
            IHubContext<VehicleDataHub> hubContext)
        {
            _logger = logger;
            _hubContext = hubContext;
        }

        /// <summary>
        /// Get MQTT connection status
        /// </summary>
        [HttpGet("status")]
        public async Task<IActionResult> GetMqttStatus()
        {
            // This would typically check the MQTT service status
            // For now, return a simple status
            return Ok(new
            {
                Status = "Connected",
                Broker = "app.nelotec.co.za:8883",
                Topic = "+/data",
                Timestamp = DateTime.UtcNow
            });
        }

        /// <summary>
        /// Test SignalR broadcast
        /// </summary>
        [HttpPost("test-broadcast")]
        public async Task<IActionResult> TestBroadcast([FromBody] TestMessage message)
        {
            try
            {
                await _hubContext.Clients.Group("VehicleData")
                    .SendAsync("TestMessage", message);
                
                return Ok(new { Success = true, Message = "Test message broadcasted" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to broadcast test message");
                return StatusCode(500, new { Error = "Failed to broadcast message" });
            }
        }

        /// <summary>
        /// Send test vehicle data
        /// </summary>
        [HttpPost("test-vehicle-data")]
        public async Task<IActionResult> TestVehicleData([FromBody] VehicleDataMessage vehicleData)
        {
            try
            {
                // Broadcast to all clients
                await _hubContext.Clients.Group("VehicleData")
                    .SendAsync("VehicleDataReceived", vehicleData);
                
                // Send to specific device group if IMEI is provided
                if (!string.IsNullOrEmpty(vehicleData.IMEI))
                {
                    await _hubContext.Clients.Group($"Device_{vehicleData.IMEI}")
                        .SendAsync("DeviceDataReceived", vehicleData);
                }
                
                return Ok(new { Success = true, Message = "Test vehicle data broadcasted" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to broadcast test vehicle data");
                return StatusCode(500, new { Error = "Failed to broadcast vehicle data" });
            }
        }
    }

    public class TestMessage
    {
        public string Message { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}
