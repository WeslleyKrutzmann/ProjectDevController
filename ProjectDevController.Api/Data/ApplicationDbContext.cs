using Microsoft.EntityFrameworkCore;
using ProjectDevController.Api.Models;

namespace ProjectDevController.Api.Data;

public sealed class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<WorkItem> WorkItems => Set<WorkItem>();
    public DbSet<TaskComment> TaskComments => Set<TaskComment>();
    public DbSet<TimeEntry> TimeEntries => Set<TimeEntry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(b =>
        {
            b.HasKey(x => x.Id);
            b.HasIndex(x => x.Email).IsUnique();
            b.Property(x => x.FullName).HasMaxLength(160).IsRequired();
            b.Property(x => x.Email).HasMaxLength(180).IsRequired();
            b.Property(x => x.PasswordHash).IsRequired();
            b.Property(x => x.Role).HasConversion<int>();
            b.Property(x => x.IsActive).HasDefaultValue(true);
        });

        modelBuilder.Entity<Project>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.Name).HasMaxLength(140).IsRequired();
            b.Property(x => x.Description).HasMaxLength(1000);
            b.HasOne(x => x.CreatedBy)
                .WithMany(x => x.CreatedProjects)
                .HasForeignKey(x => x.CreatedById)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<WorkItem>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.TaskNumber).IsRequired();
            b.Property(x => x.Title).HasMaxLength(200).IsRequired();
            b.Property(x => x.Description).HasMaxLength(4000);
            b.Property(x => x.Status).HasConversion<int>();

            b.HasOne(x => x.Project)
                .WithMany(x => x.WorkItems)
                .HasForeignKey(x => x.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.CreatedBy)
                .WithMany(x => x.CreatedWorkItems)
                .HasForeignKey(x => x.CreatedById)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasOne(x => x.ResponsibleDeveloper)
                .WithMany(x => x.ResponsibleWorkItems)
                .HasForeignKey(x => x.ResponsibleDeveloperId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasOne(x => x.AssignedTo)
                .WithMany(x => x.AssignedWorkItems)
                .HasForeignKey(x => x.AssignedToId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<TaskComment>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.Content).HasMaxLength(4000).IsRequired();
            b.HasOne(x => x.WorkItem)
                .WithMany(x => x.Comments)
                .HasForeignKey(x => x.WorkItemId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.Author)
                .WithMany(x => x.Comments)
                .HasForeignKey(x => x.AuthorId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<TimeEntry>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.Hours).HasColumnType("numeric(5,2)");
            b.Property(x => x.Description).HasMaxLength(1500);
            b.HasOne(x => x.WorkItem)
                .WithMany(x => x.TimeEntries)
                .HasForeignKey(x => x.WorkItemId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.User)
                .WithMany(x => x.TimeEntries)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
