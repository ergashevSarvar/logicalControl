package uz.logicalcontrol.backend.payload;

import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class ClassifierDtos {

    private ClassifierDtos() {
    }

    public record DepartmentRequest(
        @NotBlank String name,
        @NotBlank String departmentType,
        Boolean active
    ) {
    }

    public record DepartmentItem(
        UUID id,
        String name,
        String departmentType,
        boolean active,
        Instant createdAt,
        Instant updatedAt
    ) {
    }

    public record ProcessStageRequest(
        @NotBlank String name,
        String description,
        Boolean active,
        Integer sortOrder
    ) {
    }

    public record ProcessStageItem(
        UUID id,
        String name,
        String description,
        int sortOrder,
        boolean active,
        Instant createdAt,
        Instant updatedAt
    ) {
    }

    public record SystemTypeRequest(
        @NotBlank String systemName,
        @NotBlank String scopeType,
        Boolean active
    ) {
    }

    public record SystemTypeItem(
        UUID id,
        String systemName,
        String scopeType,
        boolean active,
        Instant createdAt,
        Instant updatedAt
    ) {
    }

    public record ServerRequest(
        @NotBlank String name,
        String description,
        Boolean active
    ) {
    }

    public record ServerItem(
        UUID id,
        String name,
        String description,
        boolean active,
        Instant createdAt,
        Instant updatedAt
    ) {
    }

    public record RoleRequest(
        @NotBlank String name,
        Boolean active
    ) {
    }

    public record RoleItem(
        UUID id,
        String name,
        boolean active,
        Instant createdAt,
        Instant updatedAt
    ) {
    }

    public record StateRequest(
        @NotBlank String code,
        @NotBlank String name,
        @NotBlank String lang,
        Boolean active
    ) {
    }

    public record StateItem(
        UUID id,
        String code,
        String name,
        String lang,
        boolean active,
        Instant createdAt,
        Instant updatedAt
    ) {
    }

    public record TableColumnRequest(
        UUID id,
        @NotBlank String name,
        @NotBlank String dataType,
        String description,
        Boolean nullable,
        Integer ordinalPosition
    ) {
    }

    public record TableRequest(
        @NotBlank String tableName,
        @NotBlank String description,
        @NotBlank String systemType,
        List<TableColumnRequest> columns
    ) {
    }

    public record TableColumnItem(
        UUID id,
        String name,
        String dataType,
        String description,
        Boolean nullable,
        int ordinalPosition
    ) {
    }

    public record TableItem(
        UUID id,
        String tableName,
        String description,
        String systemType,
        List<TableColumnItem> columns
    ) {
    }
}

