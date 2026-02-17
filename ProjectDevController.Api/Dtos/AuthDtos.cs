namespace ProjectDevController.Api.Dtos;

public sealed record LoginRequest(string Email, string Password);

public sealed record RegisterRequest(string FullName, string Email, string Password, string Role);

public sealed record FirstAccessStatusResponse(bool HasUsers);

public sealed record FirstAccessCreateRequest(string FullName, string Email, string Password);

public sealed record AuthResponse(string Token, DateTime ExpiresAtUtc, UserDto User);
