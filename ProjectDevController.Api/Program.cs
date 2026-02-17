using System.Text;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ProjectDevController.Api.Data;
using ProjectDevController.Api.Models;
using ProjectDevController.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"));
});

builder.Services.AddScoped<PasswordHasher<User>>();
builder.Services.AddScoped<JwtService>();

var jwtSection = builder.Configuration.GetSection("Jwt");
var issuer = jwtSection["Issuer"] ?? "ProjectDevController";
var audience = jwtSection["Audience"] ?? "ProjectDevControllerClient";
var secret = jwtSection["Secret"] ?? throw new InvalidOperationException("JWT secret not configured.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = issuer,
            ValidAudience = audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
            ClockSkew = TimeSpan.FromMinutes(1)
        };
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                var sub = context.Principal?.FindFirstValue("sub");
                if (!Guid.TryParse(sub, out var userId))
                {
                    context.Fail("Invalid token subject.");
                    return;
                }

                var db = context.HttpContext.RequestServices.GetRequiredService<ApplicationDbContext>();
                var isActive = await db.Users
                    .Where(x => x.Id == userId)
                    .Select(x => x.IsActive)
                    .FirstOrDefaultAsync();

                if (!isActive)
                {
                    context.Fail("User is inactive.");
                }
            }
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddPolicy("frontend", policy =>
    {
        policy
            .WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseCors("frontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await db.Database.MigrateAsync();

    //if (db.Database.IsNpgsql())
    //{
    //    db.Database.ExecuteSqlRaw("""
    //        ALTER TABLE "Users"
    //        ADD COLUMN IF NOT EXISTS "IsActive" boolean NOT NULL DEFAULT TRUE;
    //        """);

    //    db.Database.ExecuteSqlRaw("""
    //        ALTER TABLE "WorkItems"
    //        ADD COLUMN IF NOT EXISTS "TaskNumber" integer NOT NULL DEFAULT 0;
    //        """);

    //    db.Database.ExecuteSqlRaw("""
    //        WITH numbered AS (
    //            SELECT "Id", ROW_NUMBER() OVER (ORDER BY "CreatedAtUtc", "Id") AS rn
    //            FROM "WorkItems"
    //            WHERE "TaskNumber" = 0
    //        )
    //        UPDATE "WorkItems" w
    //        SET "TaskNumber" = n.rn
    //        FROM numbered n
    //        WHERE w."Id" = n."Id";
    //        """);
    //}
}

app.Run();
