package uz.logicalcontrol.backend.controller;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import uz.logicalcontrol.backend.payload.ClassifierDtos;
import uz.logicalcontrol.backend.service.ClassifierService;

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

    @GetMapping("/tables")
    public ResponseEntity<List<ClassifierDtos.TableItem>> listTables() {
        return ResponseEntity.ok(classifierService.listTables());
    }

    @PutMapping("/tables/{id}")
    public ResponseEntity<ClassifierDtos.TableItem> updateTable(
        @PathVariable("id") UUID id,
        @Valid @RequestBody ClassifierDtos.TableRequest request
    ) {
        return ResponseEntity.ok(classifierService.updateTable(id, request));
    }

    @DeleteMapping("/tables/{id}")
    public ResponseEntity<Void> deleteTable(@PathVariable("id") UUID id) {
        classifierService.deleteTable(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/servers")
    public ResponseEntity<List<ClassifierDtos.ServerItem>> listServers() {
        return ResponseEntity.ok(classifierService.listServers());
    }

    @PostMapping("/servers")
    public ResponseEntity<ClassifierDtos.ServerItem> createServer(
        @Valid @RequestBody ClassifierDtos.ServerRequest request
    ) {
        return ResponseEntity.ok(classifierService.createServer(request));
    }

    @GetMapping("/roles")
    public ResponseEntity<List<ClassifierDtos.RoleItem>> listRoles() {
        return ResponseEntity.ok(classifierService.listRoles());
    }

    @PostMapping("/roles")
    public ResponseEntity<ClassifierDtos.RoleItem> createRole(
        @Valid @RequestBody ClassifierDtos.RoleRequest request
    ) {
        return ResponseEntity.ok(classifierService.createRole(request));
    }

    @GetMapping("/states")
    public ResponseEntity<List<ClassifierDtos.StateItem>> listStates(
        @RequestParam(value = "lang", required = false) String lang
    ) {
        return ResponseEntity.ok(classifierService.listStates(lang));
    }

    @PostMapping("/states")
    public ResponseEntity<ClassifierDtos.StateItem> createState(
        @Valid @RequestBody ClassifierDtos.StateRequest request
    ) {
        return ResponseEntity.ok(classifierService.createState(request));
    }

    @PutMapping("/states/{id}")
    public ResponseEntity<ClassifierDtos.StateItem> updateState(
        @PathVariable("id") UUID id,
        @Valid @RequestBody ClassifierDtos.StateRequest request
    ) {
        return ResponseEntity.ok(classifierService.updateState(id, request));
    }

    @DeleteMapping("/states/{id}")
    public ResponseEntity<Void> deleteState(@PathVariable("id") UUID id) {
        classifierService.deleteState(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/roles/{id}")
    public ResponseEntity<ClassifierDtos.RoleItem> updateRole(
        @PathVariable("id") UUID id,
        @Valid @RequestBody ClassifierDtos.RoleRequest request
    ) {
        return ResponseEntity.ok(classifierService.updateRole(id, request));
    }

    @DeleteMapping("/roles/{id}")
    public ResponseEntity<Void> deleteRole(@PathVariable("id") UUID id) {
        classifierService.deleteRole(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/servers/{id}")
    public ResponseEntity<ClassifierDtos.ServerItem> updateServer(
        @PathVariable("id") UUID id,
        @Valid @RequestBody ClassifierDtos.ServerRequest request
    ) {
        return ResponseEntity.ok(classifierService.updateServer(id, request));
    }

    @DeleteMapping("/servers/{id}")
    public ResponseEntity<Void> deleteServer(@PathVariable("id") UUID id) {
        classifierService.deleteServer(id);
        return ResponseEntity.noContent().build();
    }
}
