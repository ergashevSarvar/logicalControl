package uz.logicalcontrol.backend.controller;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import uz.logicalcontrol.backend.payload.ControlDtos;
import uz.logicalcontrol.backend.service.LogicalControlService;

@RestController
@RequestMapping("/api/controls")
@RequiredArgsConstructor
public class LogicalControlController {

    private final LogicalControlService logicalControlService;

    @GetMapping
    public ResponseEntity<List<ControlDtos.ControlListItem>> list(
        @RequestParam(name = "q", required = false) String q,
        @RequestParam(name = "deploymentScope", required = false) String deploymentScope,
        @RequestParam(name = "directionType", required = false) String directionType,
        @RequestParam(name = "systemName", required = false) String systemName,
        @RequestParam(name = "controlType", required = false) String controlType,
        @RequestParam(name = "processStage", required = false) String processStage
    ) {
        return ResponseEntity.ok(
            logicalControlService.list(q, deploymentScope, directionType, systemName, controlType, processStage)
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<ControlDtos.ControlDetail> get(@PathVariable("id") UUID id) {
        return ResponseEntity.ok(logicalControlService.get(id));
    }

    @GetMapping("/{id}/basis-file")
    public ResponseEntity<ByteArrayResource> downloadBasisFile(@PathVariable("id") UUID id) {
        var file = logicalControlService.getBasisFile(id);
        var mediaType = file.contentType() == null || file.contentType().isBlank()
            ? MediaType.APPLICATION_OCTET_STREAM
            : MediaType.parseMediaType(file.contentType());
        var resource = new ByteArrayResource(file.data());

        return ResponseEntity.ok()
            .contentType(mediaType)
            .contentLength(file.data().length)
            .header(
                HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"" + (file.fileName() == null ? "mn-asos" : file.fileName()) + "\""
            )
            .body(resource);
    }

    @GetMapping("/next-unique-number")
    public ResponseEntity<ControlDtos.ControlUniqueNumber> nextUniqueNumber() {
        return ResponseEntity.ok(logicalControlService.nextUniqueNumber());
    }

    @PostMapping("/overview")
    public ResponseEntity<ControlDtos.ControlDetail> createOverview(
        @RequestBody ControlDtos.ControlOverviewRequest request,
        Authentication authentication
    ) {
        return ResponseEntity.ok(logicalControlService.createOverview(request, authentication));
    }

    @PutMapping("/{id}/overview")
    public ResponseEntity<ControlDtos.ControlDetail> updateOverview(
        @PathVariable("id") UUID id,
        @RequestBody ControlDtos.ControlOverviewRequest request,
        Authentication authentication
    ) {
        return ResponseEntity.ok(logicalControlService.updateOverview(id, request, authentication));
    }

    @PostMapping
    public ResponseEntity<ControlDtos.ControlDetail> create(
        @Valid @RequestBody ControlDtos.ControlRequest request,
        Authentication authentication
    ) {
        return ResponseEntity.ok(logicalControlService.create(request, authentication));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ControlDtos.ControlDetail> update(
        @PathVariable("id") UUID id,
        @Valid @RequestBody ControlDtos.ControlRequest request,
        Authentication authentication
    ) {
        return ResponseEntity.ok(logicalControlService.update(id, request, authentication));
    }

    @PostMapping("/{id}/duplicate")
    public ResponseEntity<ControlDtos.ControlDetail> duplicate(@PathVariable("id") UUID id, Authentication authentication) {
        return ResponseEntity.ok(logicalControlService.duplicate(id, authentication));
    }
}
