using Microsoft.AspNetCore.Identity;

namespace NeloFMS.API.Models
{
    public class AppUser : IdentityUser
    {
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? TenantId { get; set; }

        public string FullName => string.Join(' ', new[] { FirstName, LastName }.Where(s => !string.IsNullOrWhiteSpace(s)));
        
        // Navigation properties
        public virtual Tenant? Tenant { get; set; }
    }
}
