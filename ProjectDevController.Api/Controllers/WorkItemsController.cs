using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectDevController.Api.Data;
using ProjectDevController.Api.Dtos;
using ProjectDevController.Api.Models;
using ProjectDevController.Api.Services;

namespace ProjectDevController.Api.Controllers;

[ApiController]
[Route("api/work-items")]
[Authorize]
public sealed class WorkItemsController(ApplicationDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<WorkItemDto>>> List(
        [FromQuery] Guid? projectId,
        [FromQuery] string? status,
        [FromQuery] Guid? assignedToId,
        [FromQuery] Guid? responsibleDeveloperId)
    {
        var query = db.WorkItems
            .Include(x => x.Project)
            .Include(x => x.CreatedBy)
            .Include(x => x.AssignedTo)
            .Include(x => x.ResponsibleDeveloper)
            .Include(x => x.TimeEntries)
            .AsQueryable();

        if (projectId.HasValue)
        {
            query = query.Where(x => x.ProjectId == projectId.Value);
        }

        if (assignedToId.HasValue)
        {
            query = query.Where(x => x.AssignedToId == assignedToId.Value);
        }

        if (responsibleDeveloperId.HasValue)
        {
            query = query.Where(x => x.ResponsibleDeveloperId == responsibleDeveloperId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!MappingExtensions.TryParseStatus(status, out var parsedStatus))
            {
                return BadRequest("Invalid status filter.");
            }

            query = query.Where(x => x.Status == parsedStatus);
        }

        var rows = await query
            .OrderByDescending(x => x.TaskNumber)
            .ToListAsync();

        return Ok(rows.Select(x => x.ToDto(x.TimeEntries.Sum(t => t.Hours))).ToList());
    }

    [HttpPost]
    [Authorize(Roles = "Administrator,Developer,Tester")]
    public async Task<ActionResult<WorkItemDto>> Create([FromBody] CreateWorkItemRequest request)
    {
        if (!MappingExtensions.TryParseStatus(request.Status, out var status))
        {
            return BadRequest("Invalid status.");
        }

        var projectExists = await db.Projects.AnyAsync(x => x.Id == request.ProjectId);
        if (!projectExists)
        {
            return NotFound("Project not found.");
        }

        var userIdRaw = User.FindFirstValue("sub");
        if (!Guid.TryParse(userIdRaw, out var userId))
        {
            return Unauthorized();
        }

        var maxTaskNumber = await db.WorkItems
            .Select(x => (int?)x.TaskNumber)
            .MaxAsync() ?? 0;

        var item = new WorkItem
        {
            TaskNumber = maxTaskNumber + 1,
            ProjectId = request.ProjectId,
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            Status = status,
            ResponsibleDeveloperId = request.ResponsibleDeveloperId,
            AssignedToId = request.AssignedToId,
            CreatedById = userId,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        db.WorkItems.Add(item);
        await db.SaveChangesAsync();

        var loaded = await db.WorkItems
            .Include(x => x.Project)
            .Include(x => x.CreatedBy)
            .Include(x => x.ResponsibleDeveloper)
            .Include(x => x.AssignedTo)
            .FirstAsync(x => x.Id == item.Id);

        return Created($"/api/work-items/{item.Id}", loaded.ToDto(0));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Administrator,Developer,Tester")]
    public async Task<ActionResult<WorkItemDto>> Update([FromRoute] Guid id, [FromBody] UpdateWorkItemRequest request)
    {
        var item = await db.WorkItems.FirstOrDefaultAsync(x => x.Id == id);
        if (item is null)
        {
            return NotFound();
        }

        if (!MappingExtensions.TryParseStatus(request.Status, out var status))
        {
            return BadRequest("Invalid status.");
        }

        item.Title = request.Title.Trim();
        item.Description = request.Description.Trim();
        item.Status = status;
        item.ResponsibleDeveloperId = request.ResponsibleDeveloperId;
        item.AssignedToId = request.AssignedToId;
        item.UpdatedAtUtc = DateTime.UtcNow;

        await db.SaveChangesAsync();

        var loaded = await db.WorkItems
            .Include(x => x.Project)
            .Include(x => x.CreatedBy)
            .Include(x => x.ResponsibleDeveloper)
            .Include(x => x.AssignedTo)
            .Include(x => x.TimeEntries)
            .FirstAsync(x => x.Id == id);

        return Ok(loaded.ToDto(loaded.TimeEntries.Sum(t => t.Hours)));
    }

    [HttpGet("{id:guid}/comments")]
    public async Task<ActionResult<IReadOnlyList<CommentDto>>> GetComments([FromRoute] Guid id)
    {
        var comments = await db.TaskComments
            .Include(x => x.Author)
            .Where(x => x.WorkItemId == id)
            .OrderBy(x => x.CreatedAtUtc)
            .ToListAsync();

        return Ok(comments.Select(x => x.ToDto()).ToList());
    }

    [HttpPost("{id:guid}/comments")]
    [Authorize(Roles = "Administrator,Developer,Tester")]
    public async Task<ActionResult<CommentDto>> AddComment([FromRoute] Guid id, [FromBody] CreateCommentRequest request)
    {
        var exists = await db.WorkItems.AnyAsync(x => x.Id == id);
        if (!exists)
        {
            return NotFound("Task not found.");
        }

        var userIdRaw = User.FindFirstValue("sub");
        if (!Guid.TryParse(userIdRaw, out var userId))
        {
            return Unauthorized();
        }

        var comment = new TaskComment
        {
            WorkItemId = id,
            AuthorId = userId,
            Content = request.Content.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        };

        db.TaskComments.Add(comment);
        await db.SaveChangesAsync();

        var loaded = await db.TaskComments.Include(x => x.Author).FirstAsync(x => x.Id == comment.Id);
        return Created($"/api/work-items/{id}/comments/{comment.Id}", loaded.ToDto());
    }

    [HttpGet("{id:guid}/time-entries")]
    public async Task<ActionResult<IReadOnlyList<TimeEntryDto>>> GetTimeEntries([FromRoute] Guid id)
    {
        var rows = await db.TimeEntries
            .Include(x => x.User)
            .Where(x => x.WorkItemId == id)
            .OrderByDescending(x => x.WorkDate)
            .ThenByDescending(x => x.CreatedAtUtc)
            .ToListAsync();

        return Ok(rows.Select(x => x.ToDto()).ToList());
    }

    [HttpPost("{id:guid}/time-entries")]
    [Authorize(Roles = "Administrator,Developer,Tester")]
    public async Task<ActionResult<TimeEntryDto>> AddTimeEntry([FromRoute] Guid id, [FromBody] CreateTimeEntryRequest request)
    {
        var exists = await db.WorkItems.AnyAsync(x => x.Id == id);
        if (!exists)
        {
            return NotFound("Task not found.");
        }

        if (request.Hours <= 0 || request.Hours > 24)
        {
            return BadRequest("Hours must be between 0 and 24.");
        }

        var userIdRaw = User.FindFirstValue("sub");
        if (!Guid.TryParse(userIdRaw, out var userId))
        {
            return Unauthorized();
        }

        var entry = new TimeEntry
        {
            WorkItemId = id,
            UserId = userId,
            Hours = decimal.Round(request.Hours, 2),
            Description = request.Description.Trim(),
            WorkDate = request.WorkDate,
            CreatedAtUtc = DateTime.UtcNow
        };

        db.TimeEntries.Add(entry);
        await db.SaveChangesAsync();

        var loaded = await db.TimeEntries.Include(x => x.User).FirstAsync(x => x.Id == entry.Id);
        return Created($"/api/work-items/{id}/time-entries/{entry.Id}", loaded.ToDto());
    }

    [HttpPost("{id:guid}/log-work")]
    [Authorize(Roles = "Administrator,Developer,Tester")]
    public async Task<ActionResult<WorkItemDto>> LogWork([FromRoute] Guid id, [FromBody] LogWorkRequest request)
    {
        var item = await db.WorkItems
            .Include(x => x.Project)
            .Include(x => x.CreatedBy)
            .Include(x => x.ResponsibleDeveloper)
            .Include(x => x.AssignedTo)
            .Include(x => x.TimeEntries)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (item is null)
        {
            return NotFound("Task not found.");
        }

        if (!MappingExtensions.TryParseStatus(request.Status, out var status))
        {
            return BadRequest("Invalid status.");
        }

        var workDescription = request.WorkDescription.Trim();
        if (string.IsNullOrWhiteSpace(workDescription))
        {
            return BadRequest("Work description is required.");
        }

        if (request.Hours <= 0 || request.Hours > 24)
        {
            return BadRequest("Hours must be between 0 and 24.");
        }

        var userIdRaw = User.FindFirstValue("sub");
        if (!Guid.TryParse(userIdRaw, out var userId))
        {
            return Unauthorized();
        }

        item.Status = status;
        item.AssignedToId = request.AssignedToId;
        item.UpdatedAtUtc = DateTime.UtcNow;

        var comment = new TaskComment
        {
            WorkItemId = id,
            AuthorId = userId,
            Content = workDescription,
            CreatedAtUtc = DateTime.UtcNow
        };

        var entry = new TimeEntry
        {
            WorkItemId = id,
            UserId = userId,
            Hours = decimal.Round(request.Hours, 2),
            Description = workDescription,
            WorkDate = request.WorkDate,
            CreatedAtUtc = DateTime.UtcNow
        };

        db.TaskComments.Add(comment);
        db.TimeEntries.Add(entry);
        await db.SaveChangesAsync();

        item.TimeEntries.Add(entry);
        return Ok(item.ToDto(item.TimeEntries.Sum(t => t.Hours)));
    }
}
