using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NeloFMS.API.Migrations
{
    /// <inheritdoc />
    public partial class RenameImeiNumberColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "IMEINumber",
                table: "TrackingUnits",
                newName: "ImeiNumber");

            migrationBuilder.AlterColumn<string>(
                name: "TenantId",
                table: "Vehicles",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<string>(
                name: "SimCardId",
                table: "TrackingUnits",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SimCardId",
                table: "TrackingUnits");

            migrationBuilder.RenameColumn(
                name: "ImeiNumber",
                table: "TrackingUnits",
                newName: "IMEINumber");

            migrationBuilder.AlterColumn<string>(
                name: "TenantId",
                table: "Vehicles",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);
        }
    }
}
