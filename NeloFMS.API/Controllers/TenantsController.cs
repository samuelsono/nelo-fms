using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using NeloFMS.API.Models;

namespace NeloFMS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class TenantsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TenantsController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/tenants
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Tenant>>> GetTenants()
        {
            return await _context.Tenants
                .Include(t => t.Vehicles)
                .ToListAsync();
        }

        // GET: api/tenants/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<Tenant>> GetTenant(string id)
        {
            var tenant = await _context.Tenants
                .Include(t => t.Vehicles)
                    .ThenInclude(v => v.TrackingUnit)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (tenant == null)
            {
                return NotFound();
            }

            return tenant;
        }

        // GET: api/tenants/active
        [HttpGet("active")]
        public async Task<ActionResult<IEnumerable<Tenant>>> GetActiveTenants()
        {
            return await _context.Tenants
                .Where(t => t.IsActive)
                .Include(t => t.Vehicles)
                .ToListAsync();
        }

        // POST: api/tenants
        [HttpPost]
        public async Task<ActionResult<Tenant>> CreateTenant(Tenant tenant)
        {
            tenant.Id = Guid.NewGuid().ToString();
            tenant.CreatedAt = DateTime.UtcNow;

            _context.Tenants.Add(tenant);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetTenant), new { id = tenant.Id }, tenant);
        }

        // PUT: api/tenants/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTenant(string id, Tenant tenant)
        {
            if (id != tenant.Id)
            {
                return BadRequest();
            }

            var existingTenant = await _context.Tenants.FindAsync(id);
            if (existingTenant == null)
            {
                return NotFound();
            }

            // Update properties
            existingTenant.Name = tenant.Name;
            existingTenant.ContactEmail = tenant.ContactEmail;
            existingTenant.ContactPhone = tenant.ContactPhone;
            existingTenant.Address = tenant.Address;
            existingTenant.IsActive = tenant.IsActive;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!TenantExists(id))
                {
                    return NotFound();
                }
                throw;
            }

            return NoContent();
        }

        // DELETE: api/tenants/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTenant(string id)
        {
            var tenant = await _context.Tenants.Include(t => t.Vehicles).FirstOrDefaultAsync(t => t.Id == id);
            if (tenant == null)
            {
                return NotFound();
            }

            // Check if tenant has vehicles
            if (tenant.Vehicles.Any())
            {
                return BadRequest("Cannot delete tenant with existing vehicles. Please reassign or delete vehicles first.");
            }

            _context.Tenants.Remove(tenant);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // PATCH: api/tenants/{id}/activate
        [HttpPatch("{id}/activate")]
        public async Task<IActionResult> ActivateTenant(string id)
        {
            var tenant = await _context.Tenants.FindAsync(id);
            if (tenant == null)
            {
                return NotFound();
            }

            tenant.IsActive = true;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // PATCH: api/tenants/{id}/deactivate
        [HttpPatch("{id}/deactivate")]
        public async Task<IActionResult> DeactivateTenant(string id)
        {
            var tenant = await _context.Tenants.FindAsync(id);
            if (tenant == null)
            {
                return NotFound();
            }

            tenant.IsActive = false;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // GET: api/tenants/{id}/statistics
        [HttpGet("{id}/statistics")]
        public async Task<ActionResult<TenantStatistics>> GetTenantStatistics(string id)
        {
            var tenant = await _context.Tenants.FindAsync(id);
            if (tenant == null)
            {
                return NotFound();
            }

            var statistics = new TenantStatistics
            {
                TotalVehicles = await _context.Vehicles.CountAsync(v => v.TenantId == id),
                ActiveVehicles = await _context.Vehicles.CountAsync(v => v.TenantId == id && v.Status == "active"),
                InactiveVehicles = await _context.Vehicles.CountAsync(v => v.TenantId == id && v.Status == "inactive"),
                MaintenanceVehicles = await _context.Vehicles.CountAsync(v => v.TenantId == id && v.Status == "maintenance"),
                TrackedVehicles = await _context.Vehicles.CountAsync(v => v.TenantId == id && v.TrackingUnitId != null)
            };

            return statistics;
        }

        private bool TenantExists(string id)
        {
            return _context.Tenants.Any(e => e.Id == id);
        }
    }

    public class TenantStatistics
    {
        public int TotalVehicles { get; set; }
        public int ActiveVehicles { get; set; }
        public int InactiveVehicles { get; set; }
        public int MaintenanceVehicles { get; set; }
        public int TrackedVehicles { get; set; }
    }
}