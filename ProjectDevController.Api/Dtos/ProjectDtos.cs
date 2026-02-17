namespace ProjectDevController.Api.Dtos;

public sealed record ProjectDto(Guid Id, string Name, string Description, Guid CreatedById, DateTime CreatedAtUtc, int TaskCount);

public sealed record CreateProjectRequest(string Name, string Description);
