package uz.logicalcontrol.backend.controller;

import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import uz.logicalcontrol.backend.payload.SqlRunnerDtos;
import uz.logicalcontrol.backend.service.SqlQueryRunnerService;

@RestController
@RequestMapping("/api/sql-runner")
@RequiredArgsConstructor
public class SqlQueryRunnerController {

    private final SqlQueryRunnerService sqlQueryRunnerService;

    @PostMapping("/executions")
    public ResponseEntity<SqlRunnerDtos.QueryExecutionStartResponse> startExecution(
        @Valid @RequestBody SqlRunnerDtos.QueryExecutionRequest request,
        Authentication authentication
    ) {
        return ResponseEntity.ok(sqlQueryRunnerService.startExecution(request, authentication));
    }

    @GetMapping("/executions/{id}")
    public ResponseEntity<SqlRunnerDtos.QueryExecutionStatusResponse> getExecution(
        @PathVariable("id") UUID id,
        Authentication authentication
    ) {
        return ResponseEntity.ok(sqlQueryRunnerService.getExecution(id, authentication));
    }

    @PostMapping("/executions/{id}/cancel")
    public ResponseEntity<SqlRunnerDtos.QueryExecutionStatusResponse> cancelExecution(
        @PathVariable("id") UUID id,
        Authentication authentication
    ) {
        return ResponseEntity.ok(sqlQueryRunnerService.cancelExecution(id, authentication));
    }
}
