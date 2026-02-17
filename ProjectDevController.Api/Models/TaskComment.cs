namespace ProjectDevController.Api.Models;

public sealed class TaskComment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid WorkItemId { get; set; }
    public WorkItem? WorkItem { get; set; }

    public Guid AuthorId { get; set; }
    public User? Author { get; set; }

    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
