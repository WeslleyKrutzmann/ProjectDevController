using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectDevController.Api.Data;
using ProjectDevController.Api.Dtos;
using ProjectDevController.Api.Models;
using ProjectDevController.Api.Models.Enums;
using ProjectDevController.Api.Services;
using System.Security.Claims;

namespace ProjectDevController.Api.Controllers;

[ApiController]
[Route("api/users")]
public sealed class UsersController(ApplicationDbContext db, PasswordHasher<User> passwordHasher) : ControllerBase
{
    private async Task<User?> GetCurrentUser()
    {
        var userIdRaw = User.FindFirstValue("sub");
        if (!Guid.TryParse(userIdRaw, out var userId))
        {
            return null;
        }

        return await db.Users.FirstOrDefaultAsync(x => x.Id == userId);
    }

    [HttpGet]
    [Authorize]
    public async Task<ActionResult<IReadOnlyList<UserDto>>> ListUsers()
    {
        var currentUser = await GetCurrentUser();
        if (currentUser is null)
        {
            return Unauthorized();
        }

        var users = await db.Users
            .OrderBy(x => x.FullName)
            .ToListAsync();

        return Ok(users.Select(x => x.ToDto()).ToList());
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<UserDto>> CreateUser([FromBody] CreateUserRequest request)
    {
        var currentUser = await GetCurrentUser();
        if (currentUser is null)
        {
            return Unauthorized();
        }

        if (currentUser.Role != UserRole.Administrator)
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

    [HttpPut("{id:guid}")]
    [Authorize]
    public async Task<ActionResult<UserDto>> UpdateUser([FromRoute] Guid id, [FromBody] UpdateUserRequest request)
    {
        var currentUser = await GetCurrentUser();
        if (currentUser is null)
        {
            return Unauthorized();
        }

        var targetUser = await db.Users.FirstOrDefaultAsync(x => x.Id == id);
        if (targetUser is null)
        {
            return NotFound();
        }

        var isAdmin = currentUser.Role == UserRole.Administrator;
        var isSelf = currentUser.Id == targetUser.Id;
        if (!isAdmin && !isSelf)
        {
            return Forbid();
        }

        if (!isAdmin && (!string.IsNullOrWhiteSpace(request.Role) || request.IsActive.HasValue))
        {
            return Forbid();
        }

        var email = request.Email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(x => x.Email == email && x.Id != id))
        {
            return Conflict("Email already exists.");
        }

        targetUser.FullName = request.FullName.Trim();
        targetUser.Email = email;

        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            targetUser.PasswordHash = passwordHasher.HashPassword(targetUser, request.Password);
        }

        if (isAdmin)
        {
            if (!string.IsNullOrWhiteSpace(request.Role))
            {
                if (!MappingExtensions.TryParseRole(request.Role, out var parsedRole))
                {
                    return BadRequest("Invalid role.");
                }

                targetUser.Role = parsedRole;
            }

            if (request.IsActive.HasValue)
            {
                targetUser.IsActive = request.IsActive.Value;
            }
        }

        await db.SaveChangesAsync();
        return Ok(targetUser.ToDto());
    }

    [HttpGet("assignable")]
    [Authorize]
    public async Task<ActionResult<IReadOnlyList<UserDto>>> AssignableUsers()
    {
        var users = await db.Users
            .Where(x => x.IsActive)
            .OrderBy(x => x.FullName)
            .ToListAsync();

        return Ok(users.Select(x => x.ToDto()).ToList());
    }
}
