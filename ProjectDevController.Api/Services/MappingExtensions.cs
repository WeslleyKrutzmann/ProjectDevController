using ProjectDevController.Api.Models;
using ProjectDevController.Api.Models.Enums;
using ProjectDevController.Api.Dtos;

namespace ProjectDevController.Api.Services;

public static class MappingExtensions
{
    public static UserDto ToDto(this User user) => new(user.Id, user.FullName, user.Email, user.Role.ToString(), user.IsActive);

    public static ProjectDto ToDto(this Project project, int taskCount) =>
        new(project.Id, project.Name, project.Description, project.CreatedById, project.CreatedAtUtc, taskCount);

    public static WorkItemDto ToDto(this WorkItem item, decimal totalHours) =>
        new(
            item.Id,
            item.TaskNumber,
            item.ProjectId,
            item.Project?.Name ?? string.Empty,
            item.Title,
            item.Description,
            item.Status.ToString(),
            item.CreatedById,
            item.CreatedBy?.FullName ?? string.Empty,
            item.ResponsibleDeveloperId,
            item.ResponsibleDeveloper?.FullName,
            item.AssignedToId,
            item.AssignedTo?.FullName,
            item.CreatedAtUtc,
            item.UpdatedAtUtc,
            totalHours
        );

    public static CommentDto ToDto(this TaskComment comment) =>
        new(comment.Id, comment.WorkItemId, comment.AuthorId, comment.Author?.FullName ?? string.Empty, comment.Content, comment.CreatedAtUtc);

    public static TimeEntryDto ToDto(this TimeEntry entry) =>
        new(entry.Id, entry.WorkItemId, entry.UserId, entry.User?.FullName ?? string.Empty, entry.Hours, entry.Description, entry.WorkDate, entry.CreatedAtUtc);

    public static bool TryParseRole(string rawRole, out UserRole role)
    {
        if (Enum.TryParse<UserRole>(rawRole, true, out role))
        {
            return true;
        }

        role = default;
        return false;
    }

    public static bool TryParseStatus(string rawStatus, out WorkItemStatus status)
    {
        if (Enum.TryParse<WorkItemStatus>(rawStatus, true, out status))
        {
            return true;
        }

        status = default;
        return false;
    }
}
