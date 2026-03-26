package uz.logicalcontrol.backend.mn;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import uz.logicalcontrol.backend.logging.ExecutionLogEntity;

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

    public record ControlRequest(
        @NotBlank String code,
        @NotBlank String name,
        String objective,
        @NotNull LogicalControlEntity.SystemName systemName,
        List<String> approvers,
        LocalDate startDate,
        LocalDate finishDate,
        @NotBlank String uniqueNumber,
        @NotNull LogicalControlEntity.ControlType controlType,
        @NotBlank String processStage,
        @NotBlank String authorName,
        @NotBlank String responsibleDepartment,
        @NotNull LogicalControlEntity.ControlStatus status,
        LocalDateTime suspendedUntil,
        Map<String, String> messages,
        String phoneExtension,
        Integer priorityOrder,
        String confidentialityLevel,
        Boolean smsNotificationEnabled,
        List<String> smsPhones,
        @NotNull LogicalControlEntity.DeploymentScope deploymentScope,
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
        String name,
        LogicalControlEntity.SystemName systemName,
        LogicalControlEntity.ControlType controlType,
        LogicalControlEntity.ControlStatus status,
        String processStage,
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
        LogicalControlEntity.SystemName systemName,
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
