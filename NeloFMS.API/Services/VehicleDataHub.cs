using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;

namespace NeloFMS.API.Services
{
    [Authorize]
    public class VehicleDataHub : Hub
    {
        private readonly ILogger<VehicleDataHub> _logger;

        public VehicleDataHub(ILogger<VehicleDataHub> logger)
        {
            _logger = logger;
        }

        public override async Task OnConnectedAsync()
        {
            _logger.LogInformation($"Client {Context.ConnectionId} connected to VehicleDataHub");
            // Don't auto-add to "VehicleData" group - clients should join specific device groups
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            _logger.LogInformation($"Client {Context.ConnectionId} disconnected from VehicleDataHub");
            await base.OnDisconnectedAsync(exception);
        }

        public async Task JoinDeviceGroup(string imei)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"Device_{imei}");
            _logger.LogInformation($"Client {Context.ConnectionId} joined device group {imei}");
        }

        public async Task LeaveDeviceGroup(string imei)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Device_{imei}");
            _logger.LogInformation($"Client {Context.ConnectionId} left device group {imei}");
        }
    }
}
