namespace ProjectDevController.Api.Dtos;

public sealed record WorkItemDto(
    Guid Id,
    int TaskNumber,
    Guid ProjectId,
    string ProjectName,
    string Title,
    string Description,
    string Status,
    Guid CreatedById,
    string CreatedByName,
    Guid? ResponsibleDeveloperId,
    string? ResponsibleDeveloperName,
    Guid? AssignedToId,
    string? AssignedToName,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc,
    decimal TotalHours
);

public sealed record CreateWorkItemRequest(
    Guid ProjectId,
    string Title,
    string Description,
    string Status,
    Guid? ResponsibleDeveloperId,
    Guid? AssignedToId
);

public sealed record UpdateWorkItemRequest(
    string Title,
    string Description,
    string Status,
    Guid? ResponsibleDeveloperId,
    Guid? AssignedToId
);

public sealed record LogWorkRequest(
    string WorkDescription,
    decimal Hours,
    DateOnly WorkDate,
    string Status,
    Guid? AssignedToId
);
