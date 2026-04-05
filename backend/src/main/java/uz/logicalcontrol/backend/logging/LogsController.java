package uz.logicalcontrol.backend.logging;

import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/logs")
@RequiredArgsConstructor
public class LogsController {

    private final ExecutionLogRepository executionLogRepository;

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<LogsDtos.LogsResponse> list(
        @RequestParam(name = "result", required = false) String result
    ) {
        var items = executionLogRepository.findTop40ByOrderByInstimeDesc().stream()
            .filter(log -> result == null || result.isBlank() || log.getResult().name().equalsIgnoreCase(result))
            .map(log -> new LogsDtos.LogItem(
                log.getId(),
                log.getControl().getId(),
                log.getControl().getCode(),
                log.getControl().getName(),
                log.getInstime(),
                log.getResult(),
                log.getDeclarationId(),
                log.getDeclarationUncodId(),
                log.getDurationMs(),
                log.getMatchedRuleName(),
                log.getDetails()
            ))
            .toList();

        var positive = items.stream()
            .filter(item -> item.result() == ExecutionLogEntity.ExecutionResult.POSITIVE)
            .count();
        var negative = items.size() - positive;

        return ResponseEntity.ok(new LogsDtos.LogsResponse(items.size(), positive, negative, items));
    }
}
