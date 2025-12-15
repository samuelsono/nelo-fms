using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NeloFMS.API.Migrations
{
    /// <inheritdoc />
    public partial class AddIgnitionToVehicle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "Ignition",
                table: "Vehicles",
                type: "boolean",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Ignition",
                table: "Vehicles");
        }
    }
}
