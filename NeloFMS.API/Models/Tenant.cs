using System.Text.Json.Serialization;

namespace NeloFMS.API.Models
{
    public class Tenant
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string Name { get; set; } = string.Empty;
        public string? ContactEmail { get; set; }
        public string? ContactPhone { get; set; }
        public string? Address { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool IsActive { get; set; } = true;

        // Navigation properties
        [JsonIgnore]
        public virtual ICollection<Vehicle> Vehicles { get; set; } = new List<Vehicle>();
        
        [JsonIgnore]
        public virtual ICollection<AppUser> Users { get; set; } = new List<AppUser>();
    }
}