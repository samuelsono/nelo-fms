using System.Text.Json.Serialization;

namespace NeloFMS.API.Models
{
    public class Vehicle
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string Name { get; set; } = string.Empty;
        public string PlateNumber { get; set; } = string.Empty;
        public string? Make { get; set; } // e.g., Toyota, Ford
        public string? Model { get; set; } // e.g., Camry, F-150
        public int? Year { get; set; }
        public int? Odometer { get; set; }
        public string? VIN { get; set; } // Vehicle Identification Number
        public string? Color { get; set; }
        public string Status { get; set; } = "active"; // active, inactive, maintenance
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastLocationUpdate { get; set; }
        public double? LastLatitude { get; set; }
        public double? LastLongitude { get; set; }
        public double? LastSpeed { get; set; }
        public int? FuelLevel { get; set; }
        public string? Driver { get; set; }
        public bool? Ignition { get; set; }

        // Foreign key
        public string? TenantId { get; set; } = string.Empty;
        public string? TrackingUnitId { get; set; }

        // Navigation properties
        [JsonIgnore]
        public virtual Tenant? Tenant { get; set; }
        public virtual TrackingUnit? TrackingUnit { get; set; }
    }
}