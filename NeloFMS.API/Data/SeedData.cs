using Microsoft.AspNetCore.Identity;
using NeloFMS.API.Models;

namespace NeloFMS.API.Data
{
    public static class SeedData
    {
        public static async Task EnsureSeedData(IServiceProvider serviceProvider)
        {
            var roleManager = serviceProvider.GetRequiredService<RoleManager<IdentityRole>>();
            var userManager = serviceProvider.GetRequiredService<UserManager<AppUser>>();
            var context = serviceProvider.GetRequiredService<AppDbContext>();


            // Seed Identity roles and users
            var adminRole = "Admin";
            if (!await roleManager.RoleExistsAsync(adminRole))
            {
                await roleManager.CreateAsync(new IdentityRole(adminRole));
            }

            var customerRole = "Customer";
            if (!await roleManager.RoleExistsAsync(customerRole))
            {
                await roleManager.CreateAsync(new IdentityRole(customerRole));
            }

            var adminEmail = "admin@nelotec.co.za";
            var adminUser = await userManager.FindByEmailAsync(adminEmail);
            if (adminUser == null)
            {
                adminUser = new AppUser
                {
                    UserName = "admin@nelotec.co.za",
                    Email = adminEmail,
                    FirstName = "System",
                    LastName = "Administrator",
                    EmailConfirmed = true
                };
                var createResult = await userManager.CreateAsync(adminUser, "Admin123!");
                if (createResult.Succeeded)
                {
                    await userManager.AddToRoleAsync(adminUser, adminRole);
                }
            }

            var customerEmail = "gilbert@adivtech.co.za";
            var customerUser = await userManager.FindByEmailAsync(customerEmail);
            if (customerUser == null)
            {
                customerUser = new AppUser
                {
                    UserName = "gilbert",
                    Email = customerEmail,
                    FirstName = "Gilbert",
                    LastName = "Adivtech",
                    EmailConfirmed = true,
                    TenantId = "ab834c08-0110-4874-ba91-fc9e756efd4e"
                };
                var createResult = await userManager.CreateAsync(customerUser, "Ooghumu3ae");
                if (createResult.Succeeded)
                {
                    await userManager.AddToRoleAsync(customerUser, customerRole);
                }
            }

            // Seed Fleet Management data
            await SeedFleetData(context);
        }

        private static async Task SeedFleetData(AppDbContext context)
        {
            // Seed Tenants
            if (context.Tenants.Any())
            {
                var adivhtecTenant = new Tenant
                {
                    Id = "ab834c08-0110-4874-ba91-fc9e756efd4e",
                    Name = "Adivhtec Pty Ltd",
                    ContactEmail = "gilbert@adivtech.co.za",
                    ContactPhone = "+27-00-000-0000",
                    Address = "South Africa"
                };

                var tenant1 = new Tenant
                {
                    Id = "tenant-1",
                    Name = "Demo Transport Corp",
                    ContactEmail = "contact@demotransport.com",
                    ContactPhone = "+1-555-0123",
                    Address = "123 Fleet St, Transport City, TC 12345"
                };

                var tenant2 = new Tenant
                {
                    Id = "tenant-2",
                    Name = "City Logistics Ltd",
                    ContactEmail = "info@citylogistics.com",
                    ContactPhone = "+1-555-0456",
                    Address = "456 Cargo Ave, Logistics Town, LT 67890"
                };

                context.Tenants.AddRange(adivhtecTenant, tenant1, tenant2);
                await context.SaveChangesAsync();
            }

            // Seed Tracking Units and Sim Cards
            if (!context.TrackingUnits.Any())
            {
                var trackingUnit1 = new TrackingUnit
                {
                    Id = "unit-1",
                    SerialNumber = "TU001234567",
                    Model = "GT06N",
                    Manufacturer = "Concox",
                    FirmwareVersion = "1.2.3"
                };

                var trackingUnit2 = new TrackingUnit
                {
                    Id = "unit-2",
                    SerialNumber = "TU002345678",
                    Model = "ST901",
                    Manufacturer = "Suntech",
                    FirmwareVersion = "2.1.0"
                };

                context.TrackingUnits.AddRange(trackingUnit1, trackingUnit2);

                var simCard1 = new SimCard
                {
                    MSISDN = "+1234567890",
                    IMSI = "123456789012345",
                    PUK = "12345678",
                    Carrier = "Fleet Mobile",
                    TrackingUnitId = trackingUnit1.Id
                };

                var simCard2 = new SimCard
                {
                    MSISDN = "+1234567891",
                    IMSI = "123456789012346",
                    PUK = "12345679",
                    Carrier = "Connect Wireless",
                    TrackingUnitId = trackingUnit2.Id
                };

                context.SimCards.AddRange(simCard1, simCard2);
                await context.SaveChangesAsync();
            }

            // Seed Vehicles
            if (!context.Vehicles.Any())
            {
                var vehicle1 = new Vehicle
                {
                    Name = "Fleet Vehicle Alpha",
                    PlateNumber = "ABC-1234",
                    Make = "Ford",
                    Model = "Transit",
                    Year = 2022,
                    VIN = "1FTBW2CM8NKA12345",
                    Color = "White",
                    Status = "active",
                    Driver = "John Doe",
                    FuelLevel = 85,
                    TenantId = "tenant-1",
                    TrackingUnitId = "unit-1"
                };

                var vehicle2 = new Vehicle
                {
                    Name = "Fleet Vehicle Beta",
                    PlateNumber = "XYZ-5678",
                    Make = "Mercedes",
                    Model = "Sprinter",
                    Year = 2023,
                    VIN = "WD3PE7CD5NP123456",
                    Color = "Silver",
                    Status = "active",
                    Driver = "Jane Smith",
                    FuelLevel = 60,
                    TenantId = "tenant-1",
                    TrackingUnitId = "unit-2"
                };

                var vehicle3 = new Vehicle
                {
                    Name = "City Delivery Van",
                    PlateNumber = "DEF-9012",
                    Make = "Iveco",
                    Model = "Daily",
                    Year = 2021,
                    VIN = "ZCFC35A000S123456",
                    Color = "Blue",
                    Status = "maintenance",
                    FuelLevel = 0,
                    TenantId = "tenant-2"
                };

                context.Vehicles.AddRange(vehicle1, vehicle2, vehicle3);
                await context.SaveChangesAsync();
            }
        }
    }
}
