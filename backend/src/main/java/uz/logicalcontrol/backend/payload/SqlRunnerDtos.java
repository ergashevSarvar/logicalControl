package uz.logicalcontrol.backend.payload;

import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class SqlRunnerDtos {

    private SqlRunnerDtos() {
    }

    public enum QueryExecutionStatus {
        QUEUED,
        RUNNING,
        COMPLETED,
        FAILED,
        CANCELLED
    }

    public record QueryExecutionRequest(
        @NotBlank String sql,
        @NotBlank String serverName
    ) {
    }

    public record QueryExecutionStartResponse(
        UUID executionId,
        QueryExecutionStatus status,
        String logMessage,
        boolean stopAvailable
    ) {
    }

    public record QueryExecutionResult(
        List<String> columns,
        List<List<String>> rows,
        int totalRows,
        boolean truncated
    ) {
    }

    public record QueryExecutionStatusResponse(
        UUID executionId,
        QueryExecutionStatus status,
        String serverName,
        String logMessage,
        String errorMessage,
        boolean stopAvailable,
        Instant createdAt,
        Instant startedAt,
        Instant finishedAt,
        QueryExecutionResult result
    ) {
    }
}
