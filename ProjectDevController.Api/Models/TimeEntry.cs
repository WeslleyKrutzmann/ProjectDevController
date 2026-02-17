namespace ProjectDevController.Api.Models;

public sealed class TimeEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid WorkItemId { get; set; }
    public WorkItem? WorkItem { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }

    public decimal Hours { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateOnly WorkDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
