using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NeloFMS.API.Models;

namespace NeloFMS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TrackingUnitsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TrackingUnitsController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/trackingunits
        [HttpGet]
        public async Task<ActionResult<IEnumerable<TrackingUnit>>> GetTrackingUnits()
        {
            return await _context.TrackingUnits
                .Include(tu => tu.Vehicle)
                .Include(tu => tu.SimCard)
                .ToListAsync();
        }

        // GET: api/trackingunits/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<TrackingUnit>> GetTrackingUnit(string id)
        {
            var trackingUnit = await _context.TrackingUnits
                .Include(tu => tu.Vehicle)
                .Include(tu => tu.SimCard)
                .FirstOrDefaultAsync(tu => tu.Id == id);

            if (trackingUnit == null)
            {
                return NotFound();
            }

            return trackingUnit;
        }

        // GET: api/trackingunits/available
        [HttpGet("available")]
        public async Task<ActionResult<IEnumerable<TrackingUnit>>> GetAvailableTrackingUnits()
        {
            return await _context.TrackingUnits
                .Include(tu => tu.SimCard)
                .Where(tu => tu.VehicleId == null && tu.IsActive)
                .ToListAsync();
        }

        // POST: api/trackingunits
        [HttpPost]
        public async Task<ActionResult<TrackingUnit>> CreateTrackingUnit(TrackingUnit trackingUnit)
        {
            // Check if serial number already exists
            if (await _context.TrackingUnits.AnyAsync(tu => tu.SerialNumber == trackingUnit.SerialNumber))
            {
                return BadRequest("Serial number already exists");
            }

            trackingUnit.Id = Guid.NewGuid().ToString();
            trackingUnit.CreatedAt = DateTime.UtcNow;

            _context.TrackingUnits.Add(trackingUnit);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetTrackingUnit), new { id = trackingUnit.Id }, trackingUnit);
        }

        // PUT: api/trackingunits/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTrackingUnit(string id, TrackingUnit trackingUnit)
        {
            if (id != trackingUnit.Id)
            {
                return BadRequest();
            }

            var existingUnit = await _context.TrackingUnits.FindAsync(id);
            if (existingUnit == null)
            {
                return NotFound();
            }

            // Update properties
            existingUnit.ImeiNumber = trackingUnit.ImeiNumber;
            existingUnit.SerialNumber = trackingUnit.SerialNumber;
            existingUnit.Model = trackingUnit.Model;
            existingUnit.Manufacturer = trackingUnit.Manufacturer;
            existingUnit.FirmwareVersion = trackingUnit.FirmwareVersion;
            existingUnit.IsActive = trackingUnit.IsActive;
            existingUnit.VehicleId = trackingUnit.VehicleId;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!TrackingUnitExists(id))
                {
                    return NotFound();
                }
                throw;
            }

            return NoContent();
        }

        // DELETE: api/trackingunits/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTrackingUnit(string id)
        {
            var trackingUnit = await _context.TrackingUnits.FindAsync(id);
            if (trackingUnit == null)
            {
                return NotFound();
            }

            _context.TrackingUnits.Remove(trackingUnit);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // PATCH: api/trackingunits/{id}/heartbeat
        [HttpPatch("{id}/heartbeat")]
        public async Task<IActionResult> UpdateHeartbeat(string id)
        {
            var trackingUnit = await _context.TrackingUnits.FindAsync(id);
            if (trackingUnit == null)
            {
                return NotFound();
            }

            trackingUnit.LastCommunication = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // POST: api/trackingunits/{id}/assign-vehicle
        [HttpPost("{id}/assign-vehicle")]
        public async Task<IActionResult> AssignToVehicle(string id, [FromBody] AssignVehicleRequest request)
        {
            var trackingUnit = await _context.TrackingUnits.FindAsync(id);
            if (trackingUnit == null)
            {
                return NotFound("Tracking unit not found");
            }

            var vehicle = await _context.Vehicles.FindAsync(request.VehicleId);
            if (vehicle == null)
            {
                return NotFound("Vehicle not found");
            }

            trackingUnit.VehicleId = request.VehicleId;
            vehicle.TrackingUnitId = id;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // POST: api/trackingunits/{id}/unassign-vehicle
        [HttpPost("{id}/unassign-vehicle")]
        public async Task<IActionResult> UnassignFromVehicle(string id)
        {
            var trackingUnit = await _context.TrackingUnits.Include(tu => tu.Vehicle).FirstOrDefaultAsync(tu => tu.Id == id);
            if (trackingUnit == null)
            {
                return NotFound();
            }

            if (trackingUnit.Vehicle != null)
            {
                trackingUnit.Vehicle.TrackingUnitId = null;
            }
            trackingUnit.VehicleId = null;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        private bool TrackingUnitExists(string id)
        {
            return _context.TrackingUnits.Any(e => e.Id == id);
        }
    }

    public class AssignVehicleRequest
    {
        public string VehicleId { get; set; } = string.Empty;
    }
}