package uz.logicalcontrol.backend.mn;

import java.util.List;
import java.util.UUID;

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

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/controls")
@RequiredArgsConstructor
public class LogicalControlController {

    private final LogicalControlService logicalControlService;

    @GetMapping
    public ResponseEntity<List<ControlDtos.ControlListItem>> list(
        @RequestParam(required = false) String q,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String system
    ) {
        return ResponseEntity.ok(logicalControlService.list(q, status, system));
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
