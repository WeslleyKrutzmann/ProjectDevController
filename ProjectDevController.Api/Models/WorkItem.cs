using ProjectDevController.Api.Models.Enums;

namespace ProjectDevController.Api.Models;

public sealed class WorkItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public int TaskNumber { get; set; }
    public Guid ProjectId { get; set; }
    public Project? Project { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public WorkItemStatus Status { get; set; } = WorkItemStatus.Todo;

    public Guid CreatedById { get; set; }
    public User? CreatedBy { get; set; }

    public Guid? ResponsibleDeveloperId { get; set; }
    public User? ResponsibleDeveloper { get; set; }

    public Guid? AssignedToId { get; set; }
    public User? AssignedTo { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public ICollection<TaskComment> Comments { get; set; } = new List<TaskComment>();
    public ICollection<TimeEntry> TimeEntries { get; set; } = new List<TimeEntry>();
}
