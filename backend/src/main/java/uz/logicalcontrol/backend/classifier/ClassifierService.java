package uz.logicalcontrol.backend.classifier;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ClassifierService {

    private final ClassifierDepartmentRepository classifierDepartmentRepository;
    private final ClassifierProcessStageRepository classifierProcessStageRepository;
    private final ClassifierSystemTypeRepository classifierSystemTypeRepository;

    private static final Set<String> SYSTEM_SCOPE_TYPES = Set.of("Ichki", "Tashqi");

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = ClassifierCacheConfiguration.DEPARTMENTS_CACHE, sync = true)
    public List<ClassifierDtos.DepartmentItem> listDepartments() {
        return classifierDepartmentRepository.findAllByOrderByNameAsc().stream()
            .map(this::toDepartmentItem)
            .toList();
    }

    @Transactional
    @CacheEvict(cacheNames = ClassifierCacheConfiguration.DEPARTMENTS_CACHE, allEntries = true)
    public ClassifierDtos.DepartmentItem createDepartment(ClassifierDtos.DepartmentRequest request) {
        validateDepartment(request.name(), request.departmentType(), null);

        var entity = ClassifierDepartmentEntity.builder()
            .name(request.name().trim())
            .departmentType(request.departmentType().trim())
            .active(Boolean.TRUE.equals(request.active()))
            .build();

        return toDepartmentItem(classifierDepartmentRepository.save(entity));
    }

    @Transactional
    @CacheEvict(cacheNames = ClassifierCacheConfiguration.DEPARTMENTS_CACHE, allEntries = true)
    public ClassifierDtos.DepartmentItem updateDepartment(UUID id, ClassifierDtos.DepartmentRequest request) {
        validateDepartment(request.name(), request.departmentType(), id);

        var entity = classifierDepartmentRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Boshqarma topilmadi: " + id));

        entity.setName(request.name().trim());
        entity.setDepartmentType(request.departmentType().trim());
        entity.setActive(Boolean.TRUE.equals(request.active()));

        return toDepartmentItem(classifierDepartmentRepository.save(entity));
    }

    @Transactional
    @CacheEvict(cacheNames = ClassifierCacheConfiguration.DEPARTMENTS_CACHE, allEntries = true)
    public void deleteDepartment(UUID id) {
        var entity = classifierDepartmentRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Boshqarma topilmadi: " + id));

        classifierDepartmentRepository.delete(entity);
    }

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = ClassifierCacheConfiguration.PROCESS_STAGES_CACHE, sync = true)
    public List<ClassifierDtos.ProcessStageItem> listProcessStages() {
        return classifierProcessStageRepository.findAllByOrderBySortOrderAscNameAsc().stream()
            .map(this::toProcessStageItem)
            .toList();
    }

    @Transactional
    @CacheEvict(cacheNames = ClassifierCacheConfiguration.PROCESS_STAGES_CACHE, allEntries = true)
    public ClassifierDtos.ProcessStageItem createProcessStage(ClassifierDtos.ProcessStageRequest request) {
        validateProcessStage(request.name(), null);

        var entity = ClassifierProcessStageEntity.builder()
            .name(request.name().trim())
            .description(trimToNull(request.description()))
            .sortOrder(request.sortOrder() == null ? classifierProcessStageRepository.findMaxSortOrder() + 1 : request.sortOrder())
            .active(Boolean.TRUE.equals(request.active()))
            .build();

        return toProcessStageItem(classifierProcessStageRepository.save(entity));
    }

    @Transactional
    @CacheEvict(cacheNames = ClassifierCacheConfiguration.PROCESS_STAGES_CACHE, allEntries = true)
    public ClassifierDtos.ProcessStageItem updateProcessStage(UUID id, ClassifierDtos.ProcessStageRequest request) {
        validateProcessStage(request.name(), id);

        var entity = classifierProcessStageRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Bosqich topilmadi: " + id));

        entity.setName(request.name().trim());
        entity.setDescription(trimToNull(request.description()));
        if (request.sortOrder() != null) {
            entity.setSortOrder(request.sortOrder());
        }
        entity.setActive(Boolean.TRUE.equals(request.active()));

        return toProcessStageItem(classifierProcessStageRepository.save(entity));
    }

    @Transactional
    @CacheEvict(cacheNames = ClassifierCacheConfiguration.PROCESS_STAGES_CACHE, allEntries = true)
    public void deleteProcessStage(UUID id) {
        var entity = classifierProcessStageRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Bosqich topilmadi: " + id));

        classifierProcessStageRepository.delete(entity);
    }

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = ClassifierCacheConfiguration.SYSTEM_TYPES_CACHE, sync = true)
    public List<ClassifierDtos.SystemTypeItem> listSystemTypes() {
        return classifierSystemTypeRepository.findAllByOrderBySystemNameAscScopeTypeAsc().stream()
            .map(this::toSystemTypeItem)
            .toList();
    }

    @Transactional
    @CacheEvict(cacheNames = ClassifierCacheConfiguration.SYSTEM_TYPES_CACHE, allEntries = true)
    public ClassifierDtos.SystemTypeItem createSystemType(ClassifierDtos.SystemTypeRequest request) {
        validateSystemType(request.systemName(), request.scopeType(), null);

        var entity = ClassifierSystemTypeEntity.builder()
            .systemName(request.systemName().trim())
            .scopeType(request.scopeType().trim())
            .active(Boolean.TRUE.equals(request.active()))
            .build();

        return toSystemTypeItem(classifierSystemTypeRepository.save(entity));
    }

    @Transactional
    @CacheEvict(cacheNames = ClassifierCacheConfiguration.SYSTEM_TYPES_CACHE, allEntries = true)
    public ClassifierDtos.SystemTypeItem updateSystemType(UUID id, ClassifierDtos.SystemTypeRequest request) {
        validateSystemType(request.systemName(), request.scopeType(), id);

        var entity = classifierSystemTypeRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Tizim turi topilmadi: " + id));

        entity.setSystemName(request.systemName().trim());
        entity.setScopeType(request.scopeType().trim());
        entity.setActive(Boolean.TRUE.equals(request.active()));

        return toSystemTypeItem(classifierSystemTypeRepository.save(entity));
    }

    @Transactional
    @CacheEvict(cacheNames = ClassifierCacheConfiguration.SYSTEM_TYPES_CACHE, allEntries = true)
    public void deleteSystemType(UUID id) {
        var entity = classifierSystemTypeRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Tizim turi topilmadi: " + id));

        classifierSystemTypeRepository.delete(entity);
    }

    private void validateDepartment(String name, String departmentType, UUID id) {
        var normalizedName = name == null ? "" : name.trim();
        var normalizedType = departmentType == null ? "" : departmentType.trim();

        if (normalizedName.isBlank()) {
            throw new IllegalArgumentException("Boshqarma nomi majburiy");
        }
        if (normalizedType.isBlank()) {
            throw new IllegalArgumentException("Boshqarma turi majburiy");
        }

        var duplicate = id == null
            ? classifierDepartmentRepository.existsByNameIgnoreCase(normalizedName)
            : classifierDepartmentRepository.existsByNameIgnoreCaseAndIdNot(normalizedName, id);
        if (duplicate) {
            throw new IllegalArgumentException("Bu boshqarma allaqachon mavjud");
        }
    }

    private void validateProcessStage(String name, UUID id) {
        var normalizedName = name == null ? "" : name.trim();

        if (normalizedName.isBlank()) {
            throw new IllegalArgumentException("Bosqich nomi majburiy");
        }

        var duplicateName = id == null
            ? classifierProcessStageRepository.existsByNameIgnoreCase(normalizedName)
            : classifierProcessStageRepository.existsByNameIgnoreCaseAndIdNot(normalizedName, id);
        if (duplicateName) {
            throw new IllegalArgumentException("Bu bosqich allaqachon mavjud");
        }
    }

    private void validateSystemType(String systemName, String scopeType, UUID id) {
        var normalizedSystemName = systemName == null ? "" : systemName.trim();
        var normalizedScopeType = scopeType == null ? "" : scopeType.trim();

        if (normalizedSystemName.isBlank()) {
            throw new IllegalArgumentException("Tizim nomi majburiy");
        }
        if (!SYSTEM_SCOPE_TYPES.contains(normalizedScopeType)) {
            throw new IllegalArgumentException("Ichki / tashqi turi noto'g'ri tanlangan");
        }

        var duplicateName = id == null
            ? classifierSystemTypeRepository.existsBySystemNameIgnoreCaseAndScopeTypeIgnoreCase(normalizedSystemName, normalizedScopeType)
            : classifierSystemTypeRepository.existsBySystemNameIgnoreCaseAndScopeTypeIgnoreCaseAndIdNot(normalizedSystemName, normalizedScopeType, id);
        if (duplicateName) {
            throw new IllegalArgumentException("Bu tizim turi shu yo'nalish bilan allaqachon mavjud");
        }
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        var normalized = value.trim();
        return normalized.isBlank() ? null : normalized;
    }

    private ClassifierDtos.DepartmentItem toDepartmentItem(ClassifierDepartmentEntity entity) {
        return new ClassifierDtos.DepartmentItem(
            entity.getId(),
            entity.getName(),
            entity.getDepartmentType(),
            entity.isActive(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }

    private ClassifierDtos.ProcessStageItem toProcessStageItem(ClassifierProcessStageEntity entity) {
        return new ClassifierDtos.ProcessStageItem(
            entity.getId(),
            entity.getName(),
            entity.getDescription(),
            entity.getSortOrder(),
            entity.isActive(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }

    private ClassifierDtos.SystemTypeItem toSystemTypeItem(ClassifierSystemTypeEntity entity) {
        return new ClassifierDtos.SystemTypeItem(
            entity.getId(),
            entity.getSystemName(),
            entity.getScopeType(),
            entity.isActive(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }
}
