package uz.logicalcontrol.backend.payload;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import uz.logicalcontrol.backend.entity.ExecutionLogEntity;

public final class LogsDtos {

    private LogsDtos() {
    }

    public record LogItem(
        UUID id,
        UUID controlId,
        String controlCode,
        String controlName,
        Instant instime,
        ExecutionLogEntity.ExecutionResult result,
        String declarationId,
        String declarationUncodId,
        Long durationMs,
        String matchedRuleName,
        Map<String, Object> details
    ) {
    }

    public record LogsResponse(
        long total,
        long positive,
        long negative,
        List<LogItem> items
    ) {
    }
}

