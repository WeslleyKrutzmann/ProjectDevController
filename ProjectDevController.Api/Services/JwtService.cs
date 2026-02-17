using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using ProjectDevController.Api.Models;

namespace ProjectDevController.Api.Services;

public sealed class JwtService(IConfiguration configuration)
{
    public (string Token, DateTime ExpiresAtUtc) GenerateToken(User user)
    {
        var jwtSection = configuration.GetSection("Jwt");
        var issuer = jwtSection["Issuer"] ?? "ProjectDevController";
        var audience = jwtSection["Audience"] ?? "ProjectDevControllerClient";
        var secret = jwtSection["Secret"] ?? throw new InvalidOperationException("JWT secret not configured.");
        var expiresInHours = int.TryParse(jwtSection["ExpiresInHours"], out var h) ? h : 12;

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiresAt = DateTime.UtcNow.AddHours(expiresInHours);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(ClaimTypes.Name, user.FullName),
            new(ClaimTypes.Role, user.Role.ToString())
        };

        var token = new JwtSecurityToken(
            issuer,
            audience,
            claims,
            expires: expiresAt,
            signingCredentials: credentials
        );

        var encoded = new JwtSecurityTokenHandler().WriteToken(token);
        return (encoded, expiresAt);
    }
}
