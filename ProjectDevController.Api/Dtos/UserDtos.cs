namespace ProjectDevController.Api.Dtos;

public sealed record UserDto(Guid Id, string FullName, string Email, string Role, bool IsActive);

public sealed record CreateUserRequest(string FullName, string Email, string Password, string Role);

public sealed record UpdateUserRequest(
    string FullName,
    string Email,
    string? Password,
    string? Role,
    bool? IsActive
);
