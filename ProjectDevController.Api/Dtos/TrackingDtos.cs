namespace ProjectDevController.Api.Dtos;

public sealed record CommentDto(Guid Id, Guid WorkItemId, Guid AuthorId, string AuthorName, string Content, DateTime CreatedAtUtc);

public sealed record CreateCommentRequest(string Content);

public sealed record TimeEntryDto(Guid Id, Guid WorkItemId, Guid UserId, string UserName, decimal Hours, string Description, DateOnly WorkDate, DateTime CreatedAtUtc);

public sealed record CreateTimeEntryRequest(decimal Hours, string Description, DateOnly WorkDate);

public sealed record HoursByUserReportRow(Guid UserId, string UserName, string Role, decimal TotalHours);
