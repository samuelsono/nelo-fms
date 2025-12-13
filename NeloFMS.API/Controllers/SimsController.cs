using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NeloFMS.API.Models;

namespace NeloFMS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SimsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SimsController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/sims
        [HttpGet]
        public async Task<ActionResult<IEnumerable<SimCard>>> GetSimCards()
        {
            return await _context.SimCards
                .Include(sc => sc.TrackingUnit)
                    .ThenInclude(tu => tu!.Vehicle)
                .ToListAsync();
        }

        // GET: api/sims/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<SimCard>> GetSimCard(string id)
        {
            var simCard = await _context.SimCards
                .Include(sc => sc.TrackingUnit)
                    .ThenInclude(tu => tu!.Vehicle)
                .FirstOrDefaultAsync(sc => sc.Id == id);

            if (simCard == null)
            {
                return NotFound();
            }

            return simCard;
        }

        // GET: api/sims/msisdn/{msisdn}
        [HttpGet("msisdn/{msisdn}")]
        public async Task<ActionResult<SimCard>> GetSimCardByMSISDN(string msisdn)
        {
            var simCard = await _context.SimCards
                .Include(sc => sc.TrackingUnit)
                    .ThenInclude(tu => tu!.Vehicle)
                .FirstOrDefaultAsync(sc => sc.MSISDN == msisdn);

            if (simCard == null)
            {
                return NotFound();
            }

            return simCard;
        }

        // GET: api/sims/available
        [HttpGet("available")]
        public async Task<ActionResult<IEnumerable<SimCard>>> GetAvailableSimCards()
        {
            return await _context.SimCards
                .Where(sc => sc.TrackingUnitId == null && sc.IsActive)
                .ToListAsync();
        }

        // GET: api/sims/carrier/{carrier}
        [HttpGet("carrier/{carrier}")]
        public async Task<ActionResult<IEnumerable<SimCard>>> GetSimCardsByCarrier(string carrier)
        {
            return await _context.SimCards
                .Include(sc => sc.TrackingUnit)
                .Where(sc => sc.Carrier == carrier)
                .ToListAsync();
        }

        // POST: api/sims
        [HttpPost]
        public async Task<ActionResult<SimCard>> CreateSimCard(SimCard simCard)
        {
            // Check if MSISDN already exists
            if (await _context.SimCards.AnyAsync(sc => sc.MSISDN == simCard.MSISDN))
            {
                return BadRequest("MSISDN already exists");
            }

            // Check if IMSI already exists
            if (await _context.SimCards.AnyAsync(sc => sc.IMSI == simCard.IMSI))
            {
                return BadRequest("IMSI already exists");
            }

            // Validate tracking unit if provided
            if (!string.IsNullOrEmpty(simCard.TrackingUnitId))
            {
                var trackingUnit = await _context.TrackingUnits.FindAsync(simCard.TrackingUnitId);
                if (trackingUnit == null)
                {
                    return BadRequest("Invalid tracking unit ID");
                }

                // Check if tracking unit already has a SIM card
                if (await _context.SimCards.AnyAsync(sc => sc.TrackingUnitId == simCard.TrackingUnitId))
                {
                    return BadRequest("Tracking unit already has a SIM card assigned");
                }
            }

            simCard.Id = Guid.NewGuid().ToString();
            simCard.CreatedAt = DateTime.UtcNow;

            _context.SimCards.Add(simCard);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetSimCard), new { id = simCard.Id }, simCard);
        }

        // PUT: api/sims/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateSimCard(string id, SimCard simCard)
        {
            if (id != simCard.Id)
            {
                return BadRequest();
            }

            var existingSimCard = await _context.SimCards.FindAsync(id);
            if (existingSimCard == null)
            {
                return NotFound();
            }

            // Update properties
            existingSimCard.MSISDN = simCard.MSISDN;
            existingSimCard.IMSI = simCard.IMSI;
            existingSimCard.PUK = simCard.PUK;
            existingSimCard.Carrier = simCard.Carrier;
            existingSimCard.IsActive = simCard.IsActive;
            existingSimCard.TrackingUnitId = simCard.TrackingUnitId;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!SimCardExists(id))
                {
                    return NotFound();
                }
                throw;
            }

            return NoContent();
        }

        // DELETE: api/sims/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSimCard(string id)
        {
            var simCard = await _context.SimCards.FindAsync(id);
            if (simCard == null)
            {
                return NotFound();
            }

            _context.SimCards.Remove(simCard);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // POST: api/sims/{id}/assign-tracking-unit
        [HttpPost("{id}/assign-tracking-unit")]
        public async Task<IActionResult> AssignToTrackingUnit(string id, [FromBody] AssignTrackingUnitRequest request)
        {
            var simCard = await _context.SimCards.FindAsync(id);
            if (simCard == null)
            {
                return NotFound("SIM card not found");
            }

            var trackingUnit = await _context.TrackingUnits.Include(tu => tu.SimCard).FirstOrDefaultAsync(tu => tu.Id == request.TrackingUnitId);
            if (trackingUnit == null)
            {
                return NotFound("Tracking unit not found");
            }

            // Check if tracking unit already has a SIM card
            if (trackingUnit.SimCard != null)
            {
                return BadRequest("Tracking unit already has a SIM card assigned");
            }

            simCard.TrackingUnitId = request.TrackingUnitId;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // POST: api/sims/{id}/unassign-tracking-unit
        [HttpPost("{id}/unassign-tracking-unit")]
        public async Task<IActionResult> UnassignFromTrackingUnit(string id)
        {
            var simCard = await _context.SimCards.FindAsync(id);
            if (simCard == null)
            {
                return NotFound();
            }

            simCard.TrackingUnitId = null;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // PATCH: api/sims/{id}/activate
        [HttpPatch("{id}/activate")]
        public async Task<IActionResult> ActivateSimCard(string id)
        {
            var simCard = await _context.SimCards.FindAsync(id);
            if (simCard == null)
            {
                return NotFound();
            }

            simCard.IsActive = true;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // PATCH: api/sims/{id}/deactivate
        [HttpPatch("{id}/deactivate")]
        public async Task<IActionResult> DeactivateSimCard(string id)
        {
            var simCard = await _context.SimCards.FindAsync(id);
            if (simCard == null)
            {
                return NotFound();
            }

            simCard.IsActive = false;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool SimCardExists(string id)
        {
            return _context.SimCards.Any(e => e.Id == id);
        }
    }

    public class AssignTrackingUnitRequest
    {
        public string TrackingUnitId { get; set; } = string.Empty;
    }
}