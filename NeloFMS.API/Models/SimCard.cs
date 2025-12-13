using System.Text.Json.Serialization;

namespace NeloFMS.API.Models
{
    public class SimCard
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string MSISDN { get; set; } = string.Empty; // Mobile phone number
        public string IMSI { get; set; } = string.Empty; // International Mobile Subscriber Identity
        public string PUK { get; set; } = string.Empty; // PIN Unlock Key
        public string? Carrier { get; set; } // Network carrier/operator
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool IsActive { get; set; } = true;

        // Foreign key
        public string? TrackingUnitId { get; set; }

        // Navigation property
        [JsonIgnore]
        public virtual TrackingUnit? TrackingUnit { get; set; }
    }
}