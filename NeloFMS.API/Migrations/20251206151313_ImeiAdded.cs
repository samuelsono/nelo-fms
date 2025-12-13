using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NeloFMS.API.Migrations
{
    /// <inheritdoc />
    public partial class ImeiAdded : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "IMEINumber",
                table: "TrackingUnits",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IMEINumber",
                table: "TrackingUnits");
        }
    }
}
