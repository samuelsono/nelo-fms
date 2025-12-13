using System.Text.Json.Serialization;

namespace NeloFMS.API.Models
{
    public class TrackingUnit
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string ImeiNumber { get; set; } = string.Empty;
        public string SerialNumber { get; set; } = string.Empty;
        public string? Model { get; set; }
        public string? Manufacturer { get; set; }
        public string? FirmwareVersion { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastCommunication { get; set; }
        public bool IsActive { get; set; } = true;

        // Foreign keys
        public string? VehicleId { get; set; }
        public string? SimCardId { get; set; }

        // Navigation properties
        [JsonIgnore]
        public virtual Vehicle? Vehicle { get; set; }
        public virtual SimCard? SimCard { get; set; }
    }
}