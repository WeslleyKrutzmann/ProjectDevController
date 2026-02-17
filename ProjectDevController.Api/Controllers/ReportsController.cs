using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectDevController.Api.Data;
using ProjectDevController.Api.Dtos;

namespace ProjectDevController.Api.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize]
public sealed class ReportsController(ApplicationDbContext db) : ControllerBase
{
    [HttpGet("hours-by-user")]
    public async Task<ActionResult<IReadOnlyList<HoursByUserReportRow>>> HoursByUser(
        [FromQuery] DateOnly? startDate,
        [FromQuery] DateOnly? endDate,
        [FromQuery] Guid? projectId)
    {
        var query = db.TimeEntries
            .Include(x => x.User)
            .Include(x => x.WorkItem)
            .AsQueryable();

        if (startDate.HasValue)
        {
            query = query.Where(x => x.WorkDate >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            query = query.Where(x => x.WorkDate <= endDate.Value);
        }

        if (projectId.HasValue)
        {
            query = query.Where(x => x.WorkItem != null && x.WorkItem.ProjectId == projectId.Value);
        }

        var rawRows = await query
            .GroupBy(x => new { x.UserId, UserName = x.User!.FullName, Role = x.User!.Role })
            .Select(g => new
            {
                g.Key.UserId,
                g.Key.UserName,
                g.Key.Role,
                TotalHours = g.Sum(x => x.Hours)
            })
            .OrderByDescending(x => x.TotalHours)
            .ToListAsync();

        var rows = rawRows
            .Select(x => new HoursByUserReportRow(
                x.UserId,
                x.UserName,
                x.Role.ToString(),
                decimal.Round(x.TotalHours, 2)))
            .ToList();

        return Ok(rows);
    }
}
