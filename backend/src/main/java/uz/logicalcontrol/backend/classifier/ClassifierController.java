package uz.logicalcontrol.backend.classifier;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/classifiers")
@RequiredArgsConstructor
public class ClassifierController {

    private final ClassifierService classifierService;

    @GetMapping("/departments")
    public ResponseEntity<List<ClassifierDtos.DepartmentItem>> listDepartments() {
        return ResponseEntity.ok(classifierService.listDepartments());
    }

    @PostMapping("/departments")
    public ResponseEntity<ClassifierDtos.DepartmentItem> createDepartment(
        @Valid @RequestBody ClassifierDtos.DepartmentRequest request
    ) {
        return ResponseEntity.ok(classifierService.createDepartment(request));
    }

    @PutMapping("/departments/{id}")
    public ResponseEntity<ClassifierDtos.DepartmentItem> updateDepartment(
        @PathVariable("id") UUID id,
        @Valid @RequestBody ClassifierDtos.DepartmentRequest request
    ) {
        return ResponseEntity.ok(classifierService.updateDepartment(id, request));
    }

    @DeleteMapping("/departments/{id}")
    public ResponseEntity<Void> deleteDepartment(@PathVariable("id") UUID id) {
        classifierService.deleteDepartment(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/process-stages")
    public ResponseEntity<List<ClassifierDtos.ProcessStageItem>> listProcessStages() {
        return ResponseEntity.ok(classifierService.listProcessStages());
    }

    @PostMapping("/process-stages")
    public ResponseEntity<ClassifierDtos.ProcessStageItem> createProcessStage(
        @Valid @RequestBody ClassifierDtos.ProcessStageRequest request
    ) {
        return ResponseEntity.ok(classifierService.createProcessStage(request));
    }

    @PutMapping("/process-stages/{id}")
    public ResponseEntity<ClassifierDtos.ProcessStageItem> updateProcessStage(
        @PathVariable("id") UUID id,
        @Valid @RequestBody ClassifierDtos.ProcessStageRequest request
    ) {
        return ResponseEntity.ok(classifierService.updateProcessStage(id, request));
    }

    @DeleteMapping("/process-stages/{id}")
    public ResponseEntity<Void> deleteProcessStage(@PathVariable("id") UUID id) {
        classifierService.deleteProcessStage(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/system-types")
    public ResponseEntity<List<ClassifierDtos.SystemTypeItem>> listSystemTypes() {
        return ResponseEntity.ok(classifierService.listSystemTypes());
    }

    @PostMapping("/system-types")
    public ResponseEntity<ClassifierDtos.SystemTypeItem> createSystemType(
        @Valid @RequestBody ClassifierDtos.SystemTypeRequest request
    ) {
        return ResponseEntity.ok(classifierService.createSystemType(request));
    }

    @PutMapping("/system-types/{id}")
    public ResponseEntity<ClassifierDtos.SystemTypeItem> updateSystemType(
        @PathVariable("id") UUID id,
        @Valid @RequestBody ClassifierDtos.SystemTypeRequest request
    ) {
        return ResponseEntity.ok(classifierService.updateSystemType(id, request));
    }

    @DeleteMapping("/system-types/{id}")
    public ResponseEntity<Void> deleteSystemType(@PathVariable("id") UUID id) {
        classifierService.deleteSystemType(id);
        return ResponseEntity.noContent().build();
    }
}
