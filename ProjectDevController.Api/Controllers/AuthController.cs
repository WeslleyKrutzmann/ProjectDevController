using System.Security.Claims;
using System.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectDevController.Api.Data;
using ProjectDevController.Api.Dtos;
using ProjectDevController.Api.Models;
using ProjectDevController.Api.Models.Enums;
using ProjectDevController.Api.Services;

namespace ProjectDevController.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(
    ApplicationDbContext db,
    PasswordHasher<User> passwordHasher,
    JwtService jwtService) : ControllerBase
{
    [HttpGet("first-access/status")]
    [AllowAnonymous]
    public async Task<ActionResult<FirstAccessStatusResponse>> FirstAccessStatus()
    {
        var hasUsers = await db.Users.AnyAsync();
        return Ok(new FirstAccessStatusResponse(hasUsers));
    }

    [HttpPost("first-access")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> FirstAccess([FromBody] FirstAccessCreateRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest("FullName, Email and Password are required.");
        }

        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable);

        if (await db.Users.AnyAsync())
        {
            return Conflict("First access is no longer available.");
        }

        var email = request.Email.Trim().ToLowerInvariant();
        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = email,
            Role = UserRole.Administrator,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow
        };

        user.PasswordHash = passwordHasher.HashPassword(user, request.Password);
        db.Users.Add(user);
        await db.SaveChangesAsync();
        await tx.CommitAsync();

        var token = jwtService.GenerateToken(user);
        return Ok(new AuthResponse(token.Token, token.ExpiresAtUtc, user.ToDto()));
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(x => x.Email == email);
        if (user is null)
        {
            return Unauthorized("Invalid credentials.");
        }

        if (!user.IsActive)
        {
            return Unauthorized("Inactive user.");
        }

        var result = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (result == PasswordVerificationResult.Failed)
        {
            return Unauthorized("Invalid credentials.");
        }

        var token = jwtService.GenerateToken(user);
        return Ok(new AuthResponse(token.Token, token.ExpiresAtUtc, user.ToDto()));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserDto>> Me()
    {
        var subRaw = User.FindFirstValue("sub");
        if (!Guid.TryParse(subRaw, out var userId))
        {
            return Unauthorized();
        }

        var user = await db.Users.FirstOrDefaultAsync(x => x.Id == userId);
        return user is null || !user.IsActive ? Unauthorized() : Ok(user.ToDto());
    }

    [HttpPost("register")]
    [Authorize]
    public async Task<ActionResult<UserDto>> Register([FromBody] RegisterRequest request)
    {
        var userIdRaw = User.FindFirstValue("sub");
        if (!Guid.TryParse(userIdRaw, out var userId))
        {
            return Unauthorized();
        }

        var currentUserRole = await db.Users
            .Where(x => x.Id == userId)
            .Select(x => x.Role)
            .FirstOrDefaultAsync();

        if (currentUserRole != UserRole.Administrator)
        {
            return Forbid();
        }

        if (!MappingExtensions.TryParseRole(request.Role, out var role))
        {
            return BadRequest("Invalid role.");
        }

        var email = request.Email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(x => x.Email == email))
        {
            return Conflict("Email already exists.");
        }

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = email,
            Role = role,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow
        };

        user.PasswordHash = passwordHasher.HashPassword(user, request.Password);
        db.Users.Add(user);
        await db.SaveChangesAsync();

        return Created($"/api/users/{user.Id}", user.ToDto());
    }
}
