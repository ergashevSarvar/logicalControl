package uz.logicalcontrol.backend.payload;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import uz.logicalcontrol.backend.entity.ExecutionLogEntity;
import uz.logicalcontrol.backend.entity.LogicalControlEntity;
import uz.logicalcontrol.backend.entity.LogicalRuleEntity;

public final class ControlDtos {

    private ControlDtos() {
    }

    public record RuleItem(
        UUID id,
        @NotBlank String name,
        String description,
        Integer sortOrder,
        Boolean active,
        @NotNull LogicalRuleEntity.RuleType ruleType,
        Map<String, Object> definition,
        Map<String, Object> visual
    ) {
    }

    public record BasisFileContent(
        String fileName,
        String contentType,
        byte[] data
    ) {
    }

    public record ControlUniqueNumber(
        String uniqueNumber
    ) {
    }

    public record ControlOverviewRequest(
        String name,
        String objective,
        String basis,
        String tableName,
        String basisFileName,
        String basisFileContentType,
        Long basisFileSize,
        String basisFileBase64,
        Boolean basisFileRemoved,
        String systemName,
        LocalDate startDate,
        LocalDate finishDate,
        LogicalControlEntity.ControlType controlType,
        String processStage,
        Boolean smsNotificationEnabled,
        List<String> smsPhones,
        LogicalControlEntity.DeploymentScope deploymentScope,
        LogicalControlEntity.DirectionType directionType,
        String confidentialityLevel
    ) {
    }

    public record ControlRequest(
        String code,
        @NotBlank String name,
        String objective,
        String basis,
        String tableName,
        String basisFileName,
        String basisFileContentType,
        Long basisFileSize,
        String basisFileBase64,
        Boolean basisFileRemoved,
        @NotBlank String systemName,
        List<String> approvers,
        LocalDate startDate,
        LocalDate finishDate,
        String uniqueNumber,
        @NotNull LogicalControlEntity.ControlType controlType,
        @NotBlank String processStage,
        String authorName,
        String responsibleDepartment,
        LogicalControlEntity.ControlStatus status,
        LocalDateTime suspendedUntil,
        Map<String, String> messages,
        String phoneExtension,
        Integer priorityOrder,
        String confidentialityLevel,
        Boolean smsNotificationEnabled,
        List<String> smsPhones,
        @NotNull LogicalControlEntity.DeploymentScope deploymentScope,
        LogicalControlEntity.DirectionType directionType,
        Integer versionNumber,
        Integer timeoutMs,
        Long lastExecutionDurationMs,
        List<String> territories,
        List<String> posts,
        Integer autoCancelAfterDays,
        Boolean conflictMonitoringEnabled,
        UUID copiedFromControlId,
        Map<String, Object> ruleBuilderCanvas,
        List<RuleItem> rules
    ) {
    }

    public record ControlListItem(
        UUID id,
        String code,
        String uniqueNumber,
        String name,
        String systemName,
        LogicalControlEntity.DeploymentScope deploymentScope,
        LogicalControlEntity.DirectionType directionType,
        LogicalControlEntity.ControlType controlType,
        LogicalControlEntity.ControlStatus status,
        String processStage,
        String confidentialityLevel,
        Integer priorityOrder,
        Integer versionNumber,
        LocalDate startDate,
        LocalDate finishDate,
        int ruleCount,
        long logCount,
        Instant updatedAt
    ) {
    }

    public record ChangeLogItem(
        UUID id,
        String actor,
        String action,
        Instant changedAt,
        Map<String, Object> details
    ) {
    }

    public record ExecutionLogItem(
        UUID id,
        Instant instime,
        ExecutionLogEntity.ExecutionResult result,
        String declarationId,
        String declarationUncodId,
        Long durationMs,
        String matchedRuleName,
        Map<String, Object> details
    ) {
    }

    public record ControlDetail(
        UUID id,
        String code,
        String name,
        String objective,
        String basis,
        String tableName,
        String basisFileName,
        String basisFileContentType,
        Long basisFileSize,
        String basisFileBase64,
        Boolean basisFileRemoved,
        boolean hasBasisFile,
        String systemName,
        List<String> approvers,
        LocalDate startDate,
        LocalDate finishDate,
        String uniqueNumber,
        LogicalControlEntity.ControlType controlType,
        String processStage,
        String authorName,
        String responsibleDepartment,
        LogicalControlEntity.ControlStatus status,
        LocalDateTime suspendedUntil,
        Map<String, String> messages,
        String phoneExtension,
        Integer priorityOrder,
        String confidentialityLevel,
        boolean smsNotificationEnabled,
        List<String> smsPhones,
        LogicalControlEntity.DeploymentScope deploymentScope,
        LogicalControlEntity.DirectionType directionType,
        Integer versionNumber,
        Integer timeoutMs,
        Long lastExecutionDurationMs,
        List<String> territories,
        List<String> posts,
        Integer autoCancelAfterDays,
        boolean conflictMonitoringEnabled,
        UUID copiedFromControlId,
        Map<String, Object> ruleBuilderCanvas,
        List<RuleItem> rules,
        List<ExecutionLogItem> recentLogs,
        List<ChangeLogItem> changeLogs,
        Instant createdAt,
        Instant updatedAt
    ) {
    }
}

