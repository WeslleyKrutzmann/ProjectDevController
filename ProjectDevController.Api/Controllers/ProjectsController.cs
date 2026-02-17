using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectDevController.Api.Data;
using ProjectDevController.Api.Dtos;
using ProjectDevController.Api.Models;
using ProjectDevController.Api.Models.Enums;
using ProjectDevController.Api.Services;

namespace ProjectDevController.Api.Controllers;

[ApiController]
[Route("api/projects")]
[Authorize]
public sealed class ProjectsController(ApplicationDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProjectDto>>> ListProjects()
    {
        var rows = await db.Projects
            .OrderBy(project => project.Name)
            .Select(project => new ProjectDto(
                project.Id,
                project.Name,
                project.Description,
                project.CreatedById,
                project.CreatedAtUtc,
                project.WorkItems.Count))
            .ToListAsync();

        return Ok(rows);
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<ProjectDto>> CreateProject([FromBody] CreateProjectRequest request)
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

        var project = new Project
        {
            Name = request.Name.Trim(),
            Description = request.Description.Trim(),
            CreatedById = userId,
            CreatedAtUtc = DateTime.UtcNow
        };

        db.Projects.Add(project);
        await db.SaveChangesAsync();

        return Created($"/api/projects/{project.Id}", project.ToDto(0));
    }
}
