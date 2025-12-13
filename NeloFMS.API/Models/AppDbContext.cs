using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace NeloFMS.API.Models
{
    public class AppDbContext : IdentityDbContext<AppUser>
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        // Fleet Management DBSets
        public DbSet<Tenant> Tenants { get; set; }
        public DbSet<Vehicle> Vehicles { get; set; }
        public DbSet<TrackingUnit> TrackingUnits { get; set; }
        public DbSet<SimCard> SimCards { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure Vehicle-Tenant relationship (Many-to-One)
            modelBuilder.Entity<Vehicle>()
                .HasOne(v => v.Tenant)
                .WithMany(t => t.Vehicles)
                .HasForeignKey(v => v.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            // Configure Vehicle-TrackingUnit relationship (One-to-One)
            modelBuilder.Entity<Vehicle>()
                .HasOne(v => v.TrackingUnit)
                .WithOne(tu => tu.Vehicle)
                .HasForeignKey<Vehicle>(v => v.TrackingUnitId)
                .OnDelete(DeleteBehavior.SetNull);

            // Configure TrackingUnit-SimCard relationship (One-to-One)
            modelBuilder.Entity<SimCard>()
                .HasOne(sc => sc.TrackingUnit)
                .WithOne(tu => tu.SimCard)
                .HasForeignKey<SimCard>(sc => sc.TrackingUnitId)
                .OnDelete(DeleteBehavior.SetNull);

            // Configure indexes for performance
            modelBuilder.Entity<Vehicle>()
                .HasIndex(v => v.PlateNumber)
                .IsUnique();

            modelBuilder.Entity<TrackingUnit>()
                .HasIndex(tu => tu.SerialNumber)
                .IsUnique();

            modelBuilder.Entity<SimCard>()
                .HasIndex(sc => sc.MSISDN)
                .IsUnique();

            modelBuilder.Entity<SimCard>()
                .HasIndex(sc => sc.IMSI)
                .IsUnique();
        }
    }
}
