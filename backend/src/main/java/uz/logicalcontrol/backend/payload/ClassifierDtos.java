package uz.logicalcontrol.backend.payload;

import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
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

    public record TableColumnItem(
        String name,
        String dataType,
        String description,
        Boolean nullable,
        int ordinalPosition
    ) {
    }

    public record TableItem(
        String tableName,
        String description,
        String systemType,
        java.util.List<TableColumnItem> columns
    ) {
    }
}

