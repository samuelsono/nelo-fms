using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NeloFMS.API.Migrations
{
    /// <inheritdoc />
    public partial class OdometerAdded : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Odometer",
                table: "Vehicles",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Odometer",
                table: "Vehicles");
        }
    }
}
