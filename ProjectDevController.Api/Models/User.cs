using ProjectDevController.Api.Models.Enums;

namespace ProjectDevController.Api.Models;

public sealed class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Developer;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public ICollection<Project> CreatedProjects { get; set; } = new List<Project>();
    public ICollection<WorkItem> CreatedWorkItems { get; set; } = new List<WorkItem>();
    public ICollection<WorkItem> ResponsibleWorkItems { get; set; } = new List<WorkItem>();
    public ICollection<WorkItem> AssignedWorkItems { get; set; } = new List<WorkItem>();
    public ICollection<TaskComment> Comments { get; set; } = new List<TaskComment>();
    public ICollection<TimeEntry> TimeEntries { get; set; } = new List<TimeEntry>();
}
