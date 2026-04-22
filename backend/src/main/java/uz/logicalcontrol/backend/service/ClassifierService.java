package uz.logicalcontrol.backend.service;

import jakarta.persistence.EntityNotFoundException;
import java.sql.PreparedStatement;
import java.sql.Types;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.logicalcontrol.backend.config.ClassifierCacheConfiguration;
import uz.logicalcontrol.backend.entity.ClassifierDepartmentEntity;
import uz.logicalcontrol.backend.entity.ClassifierProcessStageEntity;
import uz.logicalcontrol.backend.entity.ClassifierRoleEntity;
import uz.logicalcontrol.backend.entity.ClassifierServerEntity;
import uz.logicalcontrol.backend.entity.ClassifierStateEntity;
import uz.logicalcontrol.backend.entity.ClassifierSystemTypeEntity;
import uz.logicalcontrol.backend.payload.ClassifierDtos;
import uz.logicalcontrol.backend.repository.ClassifierDepartmentRepository;
import uz.logicalcontrol.backend.repository.ClassifierProcessStageRepository;
import uz.logicalcontrol.backend.repository.ClassifierRoleRepository;
import uz.logicalcontrol.backend.repository.ClassifierServerRepository;
import uz.logicalcontrol.backend.repository.ClassifierStateRepository;
import uz.logicalcontrol.backend.repository.ClassifierSystemTypeRepository;

@Service
@RequiredArgsConstructor
public class ClassifierService {

    private static final String ENTITY_METADATA_TABLE_NAME = "entity_column_metadata";
    private static final String CLASSIFIER_TABLES_NAME = "biz_tables";
    private static final String CLASSIFIER_TABLE_COLUMNS_NAME = "biz_table_columns";
    private static final String SYSTEM_TYPE_RW = "Temir yo'l (RW)";
    private static final String SYSTEM_TYPE_MB = "Yuksiz yoki yengil transport (MB)";
    private static final String SYSTEM_TYPE_EK = "Eksport uch qadam (EK)";
    private static final String SYSTEM_TYPE_AT = "Yukli avtotransport (AT)";
    private static final String SYSTEM_TYPE_EC = "Kommersiya (EC)";

    private final ClassifierDepartmentRepository classifierDepartmentRepository;
    private final ClassifierProcessStageRepository classifierProcessStageRepository;
    private final ClassifierRoleRepository classifierRoleRepository;
    private final ClassifierServerRepository classifierServerRepository;
    private final ClassifierStateRepository classifierStateRepository;
    private final ClassifierSystemTypeRepository classifierSystemTypeRepository;
    private final JdbcTemplate jdbcTemplate;

    private static final Set<String> SYSTEM_SCOPE_TYPES = Set.of("Ichki", "Tashqi");
    private static final Map<String, String> STATE_LANG_CODES = Map.of(
        "oz", "OZ",
        "uz", "UZ",
        "uzlatn", "OZ",
        "uzcyrl", "UZ",
        "ru", "RU",
        "en", "EN"
    );
    private static final List<TableDefinition> FALLBACK_TABLE_DEFINITIONS = List.of(
        new TableDefinition(
            "AUTODECL",
            "Yukli avtotransport tizimidagi asosiy deklaratsiyalar jadvali",
            SYSTEM_TYPE_AT
        ),
        new TableDefinition(
            "AUTODECLMOBILE",
            "Mobil kanal orqali yuborilgan deklaratsiyalar jadvali",
            SYSTEM_TYPE_MB
        ),
        new TableDefinition(
            "RAILWAYDECL",
            "Temir yo'l tranziti bo'yicha asosiy deklaratsiyalar jadvali",
            SYSTEM_TYPE_RW
        ),
        new TableDefinition(
            "AUTODECL_EK",
            "Eksport uch qadam tizimidagi deklaratsiyalar jadvali",
            SYSTEM_TYPE_EK
        ),
        new TableDefinition(
            "COMMERCEDECL",
            "Kommersiya yo'nalishidagi asosiy deklaratsiyalar jadvali",
            SYSTEM_TYPE_EC
        )
    );

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

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = ClassifierCacheConfiguration.SERVERS_CACHE, sync = true)
    public List<ClassifierDtos.ServerItem> listServers() {
        return classifierServerRepository.findAllByOrderByNameAsc().stream()
            .map(this::toServerItem)
            .toList();
    }

    @Transactional
    @CacheEvict(cacheNames = ClassifierCacheConfiguration.SERVERS_CACHE, allEntries = true)
    public ClassifierDtos.ServerItem createServer(ClassifierDtos.ServerRequest request) {
        validateServer(request.name(), null);

        var entity = ClassifierServerEntity.builder()
            .name(request.name().trim())
            .description(trimToNull(request.description()))
            .active(Boolean.TRUE.equals(request.active()))
            .build();

        return toServerItem(classifierServerRepository.save(entity));
    }

    @Transactional
    @CacheEvict(cacheNames = ClassifierCacheConfiguration.SERVERS_CACHE, allEntries = true)
    public ClassifierDtos.ServerItem updateServer(UUID id, ClassifierDtos.ServerRequest request) {
        validateServer(request.name(), id);

        var entity = classifierServerRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Server topilmadi: " + id));

        entity.setName(request.name().trim());
        entity.setDescription(trimToNull(request.description()));
        entity.setActive(Boolean.TRUE.equals(request.active()));

        return toServerItem(classifierServerRepository.save(entity));
    }

    @Transactional
    @CacheEvict(cacheNames = ClassifierCacheConfiguration.SERVERS_CACHE, allEntries = true)
    public void deleteServer(UUID id) {
        var entity = classifierServerRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Server topilmadi: " + id));

        classifierServerRepository.delete(entity);
    }

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = ClassifierCacheConfiguration.ROLES_CACHE, sync = true)
    public List<ClassifierDtos.RoleItem> listRoles() {
        return classifierRoleRepository.findAllByOrderByNameAsc().stream()
            .map(this::toRoleItem)
            .toList();
    }

    @Transactional
    @CacheEvict(cacheNames = ClassifierCacheConfiguration.ROLES_CACHE, allEntries = true)
    public ClassifierDtos.RoleItem createRole(ClassifierDtos.RoleRequest request) {
        validateRole(request.name(), null);

        var entity = ClassifierRoleEntity.builder()
            .name(request.name().trim())
            .active(Boolean.TRUE.equals(request.active()))
            .build();

        return toRoleItem(classifierRoleRepository.save(entity));
    }

    @Transactional
    @CacheEvict(cacheNames = ClassifierCacheConfiguration.ROLES_CACHE, allEntries = true)
    public ClassifierDtos.RoleItem updateRole(UUID id, ClassifierDtos.RoleRequest request) {
        validateRole(request.name(), id);

        var entity = classifierRoleRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Rol topilmadi: " + id));

        entity.setName(request.name().trim());
        entity.setActive(Boolean.TRUE.equals(request.active()));

        return toRoleItem(classifierRoleRepository.save(entity));
    }

    @Transactional
    @CacheEvict(cacheNames = ClassifierCacheConfiguration.ROLES_CACHE, allEntries = true)
    public void deleteRole(UUID id) {
        var entity = classifierRoleRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Rol topilmadi: " + id));

        classifierRoleRepository.delete(entity);
    }

    @Transactional(readOnly = true)
    @Cacheable(
        cacheNames = ClassifierCacheConfiguration.STATES_CACHE,
        key = "#lang == null || #lang.isBlank() ? 'ALL' : #lang.toLowerCase()",
        sync = true
    )
    public List<ClassifierDtos.StateItem> listStates(String lang) {
        var normalizedLang = normalizeStateLang(lang, true);
        var rows = normalizedLang == null
            ? classifierStateRepository.findAllByOrderByCodeAscLangCodeAscNameAsc()
            : classifierStateRepository.findAllByLangCodeIgnoreCaseOrderByCodeAscNameAsc(normalizedLang);

        return rows.stream()
            .map(this::toStateItem)
            .toList();
    }

    @Transactional
    @CacheEvict(cacheNames = ClassifierCacheConfiguration.STATES_CACHE, allEntries = true)
    public ClassifierDtos.StateItem createState(ClassifierDtos.StateRequest request) {
        var normalizedCode = normalizeStateCode(request.code());
        var normalizedLang = normalizeStateLang(request.lang(), false);
        validateState(normalizedCode, request.name(), normalizedLang, null);

        var entity = ClassifierStateEntity.builder()
            .code(normalizedCode)
            .name(request.name().trim())
            .langCode(normalizedLang)
            .active(Boolean.TRUE.equals(request.active()))
            .build();

        return toStateItem(classifierStateRepository.save(entity));
    }

    @Transactional
    @CacheEvict(cacheNames = ClassifierCacheConfiguration.STATES_CACHE, allEntries = true)
    public ClassifierDtos.StateItem updateState(UUID id, ClassifierDtos.StateRequest request) {
        var normalizedCode = normalizeStateCode(request.code());
        var normalizedLang = normalizeStateLang(request.lang(), false);
        validateState(normalizedCode, request.name(), normalizedLang, id);

        var entity = classifierStateRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Status topilmadi: " + id));

        entity.setCode(normalizedCode);
        entity.setName(request.name().trim());
        entity.setLangCode(normalizedLang);
        entity.setActive(Boolean.TRUE.equals(request.active()));

        return toStateItem(classifierStateRepository.save(entity));
    }

    @Transactional
    @CacheEvict(cacheNames = ClassifierCacheConfiguration.STATES_CACHE, allEntries = true)
    public void deleteState(UUID id) {
        var entity = classifierStateRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Status topilmadi: " + id));

        classifierStateRepository.delete(entity);
    }

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = ClassifierCacheConfiguration.TABLES_CACHE, sync = true)
    public List<ClassifierDtos.TableItem> listTables() {
        try {
            ensureClassifierTableMetadataImported();

            var metadataTables = loadTablesFromClassifierStore();
            if (!metadataTables.isEmpty()) {
                return metadataTables;
            }
        } catch (DataAccessException exception) {
            // Fall back to runtime metadata inspection below.
        }

        return FALLBACK_TABLE_DEFINITIONS.stream()
            .map(definition -> new ClassifierDtos.TableItem(
                null,
                definition.tableName(),
                definition.description(),
                definition.systemType(),
                loadLiveTableColumns(definition.tableName())
            ))
            .toList();
    }

    @Transactional
    @CacheEvict(cacheNames = ClassifierCacheConfiguration.TABLES_CACHE, allEntries = true)
    public ClassifierDtos.TableItem updateTable(UUID id, ClassifierDtos.TableRequest request) {
        validateTableRequest(request, id);

        var updated = jdbcTemplate.update(
            """
                update biz_tables
                set table_name = ?,
                    description = ?,
                    system_type = ?,
                    updated_at = current timestamp
                where id = ?
                """,
            request.tableName().trim(),
            request.description().trim(),
            request.systemType().trim(),
            toDbUuid(id)
        );
        if (updated == 0) {
            throw new EntityNotFoundException("Jadval topilmadi: " + id);
        }

        var existingColumnIds = new HashSet<>(jdbcTemplate.query(
            """
                select id
                from biz_table_columns
                where classifier_table_id = ?
                """,
            (resultSet, rowNumber) -> UUID.fromString(resultSet.getString("id")),
            toDbUuid(id)
        ));

        var columns = request.columns() == null ? List.<ClassifierDtos.TableColumnRequest>of() : request.columns();
        for (var column : columns) {
            if (!existingColumnIds.contains(column.id())) {
                throw new EntityNotFoundException("Ustun topilmadi: " + column.id());
            }

            jdbcTemplate.update(
                """
                    update biz_table_columns
                    set column_name = ?,
                        data_type = ?,
                        column_description = ?,
                        nullable = ?,
                        ordinal_position = ?,
                        updated_at = current timestamp
                    where id = ?
                      and classifier_table_id = ?
                    """,
                column.name().trim(),
                column.dataType().trim(),
                trimToNull(column.description()),
                toDbNullableFlag(column.nullable()),
                column.ordinalPosition(),
                toDbUuid(column.id()),
                toDbUuid(id)
            );
        }

        return loadStoredTableById(id);
    }

    @Transactional
    @CacheEvict(cacheNames = ClassifierCacheConfiguration.TABLES_CACHE, allEntries = true)
    public void deleteTable(UUID id) {
        var deleted = jdbcTemplate.update("delete from biz_tables where id = ?", toDbUuid(id));
        if (deleted == 0) {
            throw new EntityNotFoundException("Jadval topilmadi: " + id);
        }
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

    private void validateServer(String name, UUID id) {
        var normalizedName = name == null ? "" : name.trim();

        if (normalizedName.isBlank()) {
            throw new IllegalArgumentException("Server nomi majburiy");
        }

        var duplicateName = id == null
            ? classifierServerRepository.existsByNameIgnoreCase(normalizedName)
            : classifierServerRepository.existsByNameIgnoreCaseAndIdNot(normalizedName, id);
        if (duplicateName) {
            throw new IllegalArgumentException("Bu server allaqachon mavjud");
        }
    }

    private void validateRole(String name, UUID id) {
        var normalizedName = name == null ? "" : name.trim();

        if (normalizedName.isBlank()) {
            throw new IllegalArgumentException("Rol nomi majburiy");
        }

        var duplicateName = id == null
            ? classifierRoleRepository.existsByNameIgnoreCase(normalizedName)
            : classifierRoleRepository.existsByNameIgnoreCaseAndIdNot(normalizedName, id);
        if (duplicateName) {
            throw new IllegalArgumentException("Bu rol allaqachon mavjud");
        }
    }

    private void validateState(String code, String name, String lang, UUID id) {
        var normalizedName = name == null ? "" : name.trim();

        if (code.isBlank()) {
            throw new IllegalArgumentException("Status kodi majburiy");
        }
        if (normalizedName.isBlank()) {
            throw new IllegalArgumentException("Status nomi majburiy");
        }

        var duplicate = id == null
            ? classifierStateRepository.existsByCodeIgnoreCaseAndLangCodeIgnoreCase(code, lang)
            : classifierStateRepository.existsByCodeIgnoreCaseAndLangCodeIgnoreCaseAndIdNot(code, lang, id);
        if (duplicate) {
            throw new IllegalArgumentException("Bu status kodi va til kombinatsiyasi allaqachon mavjud");
        }
    }

    private void validateTableRequest(ClassifierDtos.TableRequest request, UUID id) {
        var normalizedTableName = request.tableName() == null ? "" : request.tableName().trim();
        var normalizedDescription = request.description() == null ? "" : request.description().trim();
        var normalizedSystemType = request.systemType() == null ? "" : request.systemType().trim();

        if (normalizedTableName.isBlank()) {
            throw new IllegalArgumentException("Jadval nomi majburiy");
        }
        if (normalizedDescription.isBlank()) {
            throw new IllegalArgumentException("Jadval tavsifi majburiy");
        }
        if (normalizedSystemType.isBlank()) {
            throw new IllegalArgumentException("Tizim turi majburiy");
        }

        var duplicateTableNameCount = jdbcTemplate.queryForObject(
            """
                select count(*)
                from biz_tables
                where lower(table_name) = lower(?)
                  and id <> ?
                """,
            Long.class,
            normalizedTableName,
            id
        );
        if (duplicateTableNameCount != null && duplicateTableNameCount > 0) {
            throw new IllegalArgumentException("Bu jadval nomi allaqachon mavjud");
        }

        var columns = request.columns() == null ? List.<ClassifierDtos.TableColumnRequest>of() : request.columns();
        var seenColumnNames = new HashSet<String>();
        for (var column : columns) {
            if (column.id() == null) {
                throw new IllegalArgumentException("Ustun identifikatori majburiy");
            }

            var normalizedColumnName = column.name() == null ? "" : column.name().trim();
            var normalizedDataType = column.dataType() == null ? "" : column.dataType().trim();
            if (normalizedColumnName.isBlank()) {
                throw new IllegalArgumentException("Ustun nomi majburiy");
            }
            if (normalizedDataType.isBlank()) {
                throw new IllegalArgumentException("Ustun turi majburiy");
            }
            if (column.ordinalPosition() == null || column.ordinalPosition() < 1) {
                throw new IllegalArgumentException("Ustun tartib raqami noto'g'ri");
            }
            if (!seenColumnNames.add(normalizedColumnName.toLowerCase(Locale.ROOT))) {
                throw new IllegalArgumentException("Bir xil ustun nomi takrorlangan: " + normalizedColumnName);
            }
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

    private ClassifierDtos.ServerItem toServerItem(ClassifierServerEntity entity) {
        return new ClassifierDtos.ServerItem(
            entity.getId(),
            entity.getName(),
            entity.getDescription(),
            entity.isActive(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }

    private ClassifierDtos.RoleItem toRoleItem(ClassifierRoleEntity entity) {
        return new ClassifierDtos.RoleItem(
            entity.getId(),
            entity.getName(),
            entity.isActive(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }

    private ClassifierDtos.StateItem toStateItem(ClassifierStateEntity entity) {
        return new ClassifierDtos.StateItem(
            entity.getId(),
            entity.getCode(),
            entity.getName(),
            entity.getLangCode(),
            entity.isActive(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }

    private ClassifierDtos.TableItem loadStoredTableById(UUID tableId) {
        var rows = jdbcTemplate.query(
            """
                select
                    t.id as table_id,
                    t.table_name,
                    t.description,
                    t.system_type,
                    c.id as column_id,
                    c.column_name,
                    c.data_type,
                    c.column_description,
                    c.nullable,
                    c.ordinal_position
                from biz_tables t
                left join biz_table_columns c
                    on c.classifier_table_id = t.id
                where t.id = ?
                order by
                    t.table_name,
                    case when c.ordinal_position is null then 1 else 0 end,
                    c.ordinal_position,
                    c.column_name
                """,
            (resultSet, rowNumber) -> new StoredClassifierTableRow(
                UUID.fromString(resultSet.getString("table_id")),
                resultSet.getString("table_name"),
                resultSet.getString("description"),
                resultSet.getString("system_type"),
                resultSet.getString("column_id") == null ? null : UUID.fromString(resultSet.getString("column_id")),
                resultSet.getString("column_name"),
                resultSet.getString("data_type"),
                resultSet.getString("column_description"),
                readNullableBoolean(resultSet, "nullable"),
                (Integer) resultSet.getObject("ordinal_position")
            ),
            tableId
        );

        if (rows.isEmpty()) {
            throw new EntityNotFoundException("Jadval topilmadi: " + tableId);
        }

        return mapStoredTablesFromRows(rows).get(0);
    }

    private void ensureClassifierTableMetadataImported() {
        if (!classifierMetadataTablesExist() || !stagingMetadataTableExists()) {
            return;
        }

        var stagingRowCount = countRows(ENTITY_METADATA_TABLE_NAME);
        if (stagingRowCount == 0) {
            return;
        }

        var classifierTableCount = countRows(CLASSIFIER_TABLES_NAME);
        var classifierColumnCount = countRows(CLASSIFIER_TABLE_COLUMNS_NAME);
        if (classifierTableCount > 0 && classifierColumnCount > 0) {
            return;
        }

        var rows = loadRowsFromStagingMetadata();
        if (rows.isEmpty()) {
            return;
        }

        rebuildClassifierTableMetadata(rows);
    }

    private List<ClassifierDtos.TableItem> loadTablesFromClassifierStore() {
        if (!classifierMetadataTablesExist()) {
            return List.of();
        }

        try {
            var rows = jdbcTemplate.query(
                """
                    select
                        t.id as table_id,
                        t.table_name,
                        t.description,
                        t.system_type,
                        c.id as column_id,
                        c.column_name,
                        c.data_type,
                        c.column_description,
                        c.nullable,
                        c.ordinal_position
                    from biz_tables t
                    left join biz_table_columns c
                        on c.classifier_table_id = t.id
                    order by
                        t.table_name,
                        case when c.ordinal_position is null then 1 else 0 end,
                        c.ordinal_position,
                        c.column_name
                    """,
                (resultSet, rowNumber) -> new StoredClassifierTableRow(
                    UUID.fromString(resultSet.getString("table_id")),
                    resultSet.getString("table_name"),
                    resultSet.getString("description"),
                    resultSet.getString("system_type"),
                    resultSet.getString("column_id") == null ? null : UUID.fromString(resultSet.getString("column_id")),
                    resultSet.getString("column_name"),
                    resultSet.getString("data_type"),
                    resultSet.getString("column_description"),
                    readNullableBoolean(resultSet, "nullable"),
                    (Integer) resultSet.getObject("ordinal_position")
                )
            );

            if (rows.isEmpty()) {
                return List.of();
            }

            return mapStoredTablesFromRows(rows);
        } catch (DataAccessException exception) {
            return List.of();
        }
    }

    private List<ClassifierDtos.TableItem> mapStoredTablesFromRows(List<StoredClassifierTableRow> rows) {
        var tables = new LinkedHashMap<UUID, StoredTableAccumulator>();
        for (var row : rows) {
            var tableName = trimToNull(row.tableName());
            if (tableName == null) {
                continue;
            }

            var accumulator = tables.computeIfAbsent(
                row.tableId(),
                key -> new StoredTableAccumulator(row.tableId(), tableName, row.description(), row.systemType())
            );
            accumulator.addColumn(row);
        }

        return tables.values().stream()
            .map(StoredTableAccumulator::toTableItem)
            .toList();
    }

    private List<TableMetadataRow> loadRowsFromStagingMetadata() {
        return jdbcTemplate.query(
            """
                select
                    entity_name,
                    entity_name_definition,
                    column_name,
                    column_name_definition,
                    column_type,
                    column_length
                from entity_column_metadata
                order by entity_name, column_name
                """,
            (resultSet, rowNumber) -> new TableMetadataRow(
                resultSet.getString("entity_name"),
                resultSet.getString("entity_name_definition"),
                resultSet.getString("column_name"),
                resultSet.getString("column_name_definition"),
                resultSet.getString("column_type"),
                resultSet.getString("column_length")
            )
        );
    }

    private void rebuildClassifierTableMetadata(List<TableMetadataRow> rows) {
        var tables = new LinkedHashMap<String, MetadataTableAccumulator>();
        for (var row : rows) {
            var entityName = normalizeEntityName(row.entityName());
            if (entityName == null) {
                continue;
            }

            var accumulator = tables.computeIfAbsent(
                entityName,
                key -> new MetadataTableAccumulator(entityName, row.entityNameDefinition())
            );
            accumulator.addColumn(row);
        }

        if (tables.isEmpty()) {
            return;
        }

        var tableRows = new ArrayList<TableInsertRow>(tables.size());
        var columnRows = new ArrayList<ColumnInsertRow>(rows.size());

        tables.values().forEach(accumulator -> {
            var tableId = UUID.randomUUID();
            tableRows.add(accumulator.toTableInsertRow(tableId));
            columnRows.addAll(accumulator.toColumnInsertRows(tableId));
        });

        jdbcTemplate.update("delete from biz_table_columns");
        jdbcTemplate.update("delete from biz_tables");

        jdbcTemplate.batchUpdate(
            """
                insert into biz_tables (
                    id,
                    table_name,
                    entity_name_definition,
                    description,
                    system_type
                ) values (?, ?, ?, ?, ?)
                """,
            tableRows,
            tableRows.size(),
            (preparedStatement, row) -> {
                preparedStatement.setString(1, toDbUuid(row.id()));
                preparedStatement.setString(2, row.tableName());
                preparedStatement.setString(3, row.entityNameDefinition());
                preparedStatement.setString(4, row.description());
                preparedStatement.setString(5, row.systemType());
            }
        );

        jdbcTemplate.batchUpdate(
            """
                insert into biz_table_columns (
                    id,
                    classifier_table_id,
                    column_name,
                    column_name_definition,
                    column_type,
                    column_length,
                    data_type,
                    column_description,
                    nullable,
                    ordinal_position
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
            columnRows,
            columnRows.size(),
            (preparedStatement, row) -> {
                preparedStatement.setString(1, toDbUuid(row.id()));
                preparedStatement.setString(2, toDbUuid(row.classifierTableId()));
                preparedStatement.setString(3, row.columnName());
                preparedStatement.setString(4, row.columnNameDefinition());
                preparedStatement.setString(5, row.columnType());
                preparedStatement.setString(6, row.columnLength());
                preparedStatement.setString(7, row.dataType());
                preparedStatement.setString(8, row.columnDescription());
                setNullableSmallInt(preparedStatement, 9, row.nullable());
                preparedStatement.setInt(10, row.ordinalPosition());
            }
        );
    }

    private boolean stagingMetadataTableExists() {
        return tableExists(ENTITY_METADATA_TABLE_NAME);
    }

    private boolean classifierMetadataTablesExist() {
        return tableExists(CLASSIFIER_TABLES_NAME) && tableExists(CLASSIFIER_TABLE_COLUMNS_NAME);
    }

    private boolean tableExists(String tableName) {
        var exists = jdbcTemplate.execute((ConnectionCallback<Boolean>) connection -> metadataTableExists(connection, tableName));
        return Boolean.TRUE.equals(exists);
    }

    private long countRows(String tableName) {
        var count = jdbcTemplate.queryForObject("select count(*) from " + tableName, Long.class);
        return count == null ? 0L : count;
    }

    private String toDbUuid(UUID id) {
        return id == null ? null : id.toString();
    }

    private String normalizeStateCode(String code) {
        var normalized = code == null ? "" : code.trim();
        if (normalized.isBlank()) {
            return "";
        }

        return normalized
            .replaceAll("[\\s-]+", "_")
            .toUpperCase(Locale.ROOT);
    }

    private String normalizeStateLang(String lang, boolean allowBlank) {
        var normalized = lang == null ? "" : lang.trim();
        if (normalized.isBlank()) {
            if (allowBlank) {
                return null;
            }
            throw new IllegalArgumentException("Til kodi majburiy");
        }

        var canonical = STATE_LANG_CODES.get(normalized.toLowerCase(Locale.ROOT));
        if (canonical == null) {
            throw new IllegalArgumentException("Til kodi noto'g'ri tanlangan");
        }
        return canonical;
    }

    private Integer toDbNullableFlag(Boolean nullable) {
        if (nullable == null) {
            return null;
        }
        return nullable ? 1 : 0;
    }

    private void setNullableSmallInt(PreparedStatement preparedStatement, int parameterIndex, Boolean value) throws SQLException {
        if (value == null) {
            preparedStatement.setNull(parameterIndex, Types.SMALLINT);
            return;
        }
        preparedStatement.setInt(parameterIndex, value ? 1 : 0);
    }

    private List<ClassifierDtos.TableColumnItem> loadLiveTableColumns(String tableName) {
        var columns = jdbcTemplate.execute((ConnectionCallback<List<ClassifierDtos.TableColumnItem>>) connection ->
            loadLiveTableColumns(connection, tableName)
        );
        return columns == null ? List.of() : columns;
    }

    private boolean metadataTableExists(Connection connection, String tableName) throws SQLException {
        var metadata = connection.getMetaData();

        for (var schemaPattern : resolveSchemaPatterns(connection)) {
            for (var tablePattern : resolveIdentifierPatterns(tableName)) {
                try (ResultSet resultSet = metadata.getTables(null, schemaPattern, tablePattern, new String[] {"TABLE"})) {
                    if (resultSet.next()) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    private List<ClassifierDtos.TableColumnItem> loadLiveTableColumns(Connection connection, String tableName) throws SQLException {
        var metadata = connection.getMetaData();

        for (var schemaPattern : resolveSchemaPatterns(connection)) {
            for (var tablePattern : resolveIdentifierPatterns(tableName)) {
                var columns = new ArrayList<ClassifierDtos.TableColumnItem>();
                try (ResultSet resultSet = metadata.getColumns(null, schemaPattern, tablePattern, "%")) {
                    while (resultSet.next()) {
                        var columnName = trimToNull(resultSet.getString("COLUMN_NAME"));
                        if (columnName == null) {
                            continue;
                        }

                        var columnType = trimToNull(resultSet.getString("TYPE_NAME"));
                        var columnLength = formatColumnLength(
                            toNullableInteger(resultSet, "COLUMN_SIZE"),
                            toNullableInteger(resultSet, "DECIMAL_DIGITS")
                        );
                        var ordinalPosition = toNullableInteger(resultSet, "ORDINAL_POSITION");

                        columns.add(new ClassifierDtos.TableColumnItem(
                            null,
                            columnName,
                            buildColumnDataType(columnType, columnLength),
                            trimToNull(resultSet.getString("REMARKS")),
                            resolveNullable(resultSet),
                            ordinalPosition == null ? columns.size() + 1 : ordinalPosition
                        ));
                    }
                }

                if (!columns.isEmpty()) {
                    columns.sort(Comparator.comparingInt(ClassifierDtos.TableColumnItem::ordinalPosition));
                    return columns;
                }
            }
        }

        return List.of();
    }

    private List<String> resolveSchemaPatterns(Connection connection) throws SQLException {
        var patterns = new ArrayList<String>();
        addSchemaPattern(patterns, connection.getSchema());
        addSchemaPattern(patterns, connection.getMetaData().getUserName());
        if (!patterns.contains(null)) {
            patterns.add(null);
        }
        return patterns;
    }

    private void addSchemaPattern(List<String> patterns, String candidate) {
        var normalized = trimToNull(candidate);
        if (normalized == null) {
            return;
        }

        if (!patterns.contains(normalized)) {
            patterns.add(normalized);
        }

        var upperCase = normalized.toUpperCase(Locale.ROOT);
        if (!patterns.contains(upperCase)) {
            patterns.add(upperCase);
        }
    }

    private List<String> resolveIdentifierPatterns(String identifier) {
        var patterns = new ArrayList<String>();
        var normalized = trimToNull(identifier);
        if (normalized == null) {
            return patterns;
        }

        patterns.add(normalized);

        var upperCase = normalized.toUpperCase(Locale.ROOT);
        if (!patterns.contains(upperCase)) {
            patterns.add(upperCase);
        }

        return patterns;
    }

    private Integer toNullableInteger(ResultSet resultSet, String columnLabel) throws SQLException {
        var value = resultSet.getInt(columnLabel);
        return resultSet.wasNull() ? null : value;
    }

    private Boolean readNullableBoolean(ResultSet resultSet, String columnLabel) throws SQLException {
        var value = resultSet.getObject(columnLabel);
        if (value == null) {
            return null;
        }

        if (value instanceof Boolean booleanValue) {
            return booleanValue;
        }

        if (value instanceof Number numberValue) {
            return numberValue.intValue() != 0;
        }

        var normalized = value.toString().trim();
        if (normalized.isEmpty()) {
            return null;
        }

        if ("1".equals(normalized) || "true".equalsIgnoreCase(normalized) || "y".equalsIgnoreCase(normalized)) {
            return Boolean.TRUE;
        }

        if ("0".equals(normalized) || "false".equalsIgnoreCase(normalized) || "n".equalsIgnoreCase(normalized)) {
            return Boolean.FALSE;
        }

        return null;
    }

    private Boolean resolveNullable(ResultSet resultSet) throws SQLException {
        var nullableCode = resultSet.getInt("NULLABLE");
        if (resultSet.wasNull()) {
            return null;
        }

        if (nullableCode == DatabaseMetaData.columnNullable) {
            return Boolean.TRUE;
        }

        if (nullableCode == DatabaseMetaData.columnNoNulls) {
            return Boolean.FALSE;
        }

        return null;
    }

    private String normalizeEntityName(String entityName) {
        var normalized = trimToNull(entityName);
        return normalized == null ? null : normalized.toUpperCase(Locale.ROOT);
    }

    private String deriveSystemType(String entityName, String entityDefinition) {
        var normalizedEntityName = entityName == null ? "" : entityName.toUpperCase(Locale.ROOT);
        var normalizedEntityDefinition = entityDefinition == null ? "" : entityDefinition.toLowerCase(Locale.ROOT);
        var simpleClassName = extractSimpleClassName(entityDefinition).toUpperCase(Locale.ROOT);

        if (normalizedEntityName.contains("_RW")
            || normalizedEntityName.startsWith("RAILWAY")
            || normalizedEntityName.endsWith("RW")
            || simpleClassName.endsWith("RW")) {
            return SYSTEM_TYPE_RW;
        }

        if (normalizedEntityName.contains("MOBILE")
            || normalizedEntityName.contains("_MB")
            || normalizedEntityName.endsWith("MB")
            || normalizedEntityDefinition.contains(".mb.")
            || simpleClassName.contains("MOBILE")) {
            return SYSTEM_TYPE_MB;
        }

        if (normalizedEntityName.contains("_CM")
            || normalizedEntityName.contains("COMMERCE")
            || normalizedEntityName.startsWith("CM")
            || normalizedEntityName.endsWith("EC")
            || normalizedEntityDefinition.contains(".commerce.")
            || normalizedEntityDefinition.contains(".cm.")
            || simpleClassName.contains("COMMERCE")
            || simpleClassName.startsWith("CM")) {
            return SYSTEM_TYPE_EC;
        }

        if (normalizedEntityDefinition.contains(".eksport.")
            || normalizedEntityName.contains("_EK")
            || normalizedEntityName.endsWith("EK")
            || normalizedEntityName.endsWith("EKA")
            || normalizedEntityName.endsWith("EKV")
            || simpleClassName.endsWith("EK")
            || simpleClassName.endsWith("EKA")
            || simpleClassName.endsWith("EKV")) {
            return SYSTEM_TYPE_EK;
        }

        return SYSTEM_TYPE_AT;
    }

    private String buildTableDescription(String entityName, String entityDefinition, String systemType) {
        var displayName = humanizeIdentifier(extractSimpleClassName(entityDefinition));
        if (displayName == null) {
            displayName = humanizeIdentifier(extractBaseTableName(entityName));
        }

        if (displayName == null) {
            return systemType + " tizimiga oid jadval";
        }

        return systemType + " tizimiga oid " + displayName + " jadvali";
    }

    private String buildColumnDescription(String columnDefinition) {
        var normalized = trimToNull(columnDefinition);
        if (normalized == null) {
            return null;
        }

        return "Java field: " + normalized;
    }

    private String buildColumnDataType(String columnType, String columnLength) {
        var normalizedType = trimToNull(columnType);
        var normalizedLength = trimToNull(columnLength);

        if (normalizedType == null) {
            return normalizedLength == null ? "UNKNOWN" : normalizedLength;
        }

        return normalizedLength == null ? normalizedType : normalizedType + " (" + normalizedLength + ")";
    }

    private String formatColumnLength(Integer columnSize, Integer decimalDigits) {
        if (columnSize == null || columnSize <= 0) {
            return null;
        }

        if (decimalDigits != null && decimalDigits > 0) {
            return columnSize + "," + decimalDigits;
        }

        return String.valueOf(columnSize);
    }

    private String extractBaseTableName(String entityName) {
        var normalized = trimToNull(entityName);
        if (normalized == null) {
            return null;
        }

        var separatorIndex = normalized.lastIndexOf('.');
        return separatorIndex >= 0 ? normalized.substring(separatorIndex + 1) : normalized;
    }

    private String extractSimpleClassName(String entityDefinition) {
        var normalized = trimToNull(entityDefinition);
        if (normalized == null) {
            return "";
        }

        var separatorIndex = normalized.lastIndexOf('.');
        return separatorIndex >= 0 ? normalized.substring(separatorIndex + 1) : normalized;
    }

    private String humanizeIdentifier(String value) {
        var normalized = trimToNull(value);
        if (normalized == null) {
            return null;
        }

        return normalized
            .replaceAll("([a-z0-9])([A-Z])", "$1 $2")
            .replace('_', ' ')
            .replace('.', ' ')
            .trim();
    }

    private record TableDefinition(
        String tableName,
        String description,
        String systemType
    ) {
    }

    private record TableMetadataRow(
        String entityName,
        String entityNameDefinition,
        String columnName,
        String columnNameDefinition,
        String columnType,
        String columnLength
    ) {
    }

    private record StoredClassifierTableRow(
        UUID tableId,
        String tableName,
        String description,
        String systemType,
        UUID columnId,
        String columnName,
        String dataType,
        String columnDescription,
        Boolean nullable,
        Integer ordinalPosition
    ) {
    }

    private record TableInsertRow(
        UUID id,
        String tableName,
        String entityNameDefinition,
        String description,
        String systemType
    ) {
    }

    private record ColumnInsertRow(
        UUID id,
        UUID classifierTableId,
        String columnName,
        String columnNameDefinition,
        String columnType,
        String columnLength,
        String dataType,
        String columnDescription,
        Boolean nullable,
        int ordinalPosition
    ) {
    }

    private final class MetadataTableAccumulator {

        private final String entityName;
        private final String entityDefinition;
        private final String systemType;
        private final LinkedHashMap<String, TableMetadataRow> columnsByName = new LinkedHashMap<>();

        private MetadataTableAccumulator(String entityName, String entityDefinition) {
            this.entityName = entityName;
            this.entityDefinition = entityDefinition;
            this.systemType = deriveSystemType(entityName, entityDefinition);
        }

        private void addColumn(TableMetadataRow row) {
            var columnName = trimToNull(row.columnName());
            if (columnName == null || columnsByName.containsKey(columnName)) {
                return;
            }

            columnsByName.put(columnName, row);
        }

        private TableInsertRow toTableInsertRow(UUID tableId) {
            return new TableInsertRow(
                tableId,
                entityName,
                trimToNull(entityDefinition),
                buildTableDescription(entityName, entityDefinition, systemType),
                systemType
            );
        }

        private List<ColumnInsertRow> toColumnInsertRows(UUID tableId) {
            var result = new ArrayList<ColumnInsertRow>(columnsByName.size());

            columnsByName.values().forEach(row -> result.add(
                new ColumnInsertRow(
                    UUID.randomUUID(),
                    tableId,
                    row.columnName(),
                    trimToNull(row.columnNameDefinition()),
                    trimToNull(row.columnType()),
                    trimToNull(row.columnLength()),
                    buildColumnDataType(row.columnType(), row.columnLength()),
                    buildColumnDescription(row.columnNameDefinition()),
                    null,
                    result.size() + 1
                )
            ));

            return result;
        }

        private ClassifierDtos.TableItem toTableItem() {
            var columns = new ArrayList<ClassifierDtos.TableColumnItem>(columnsByName.size());
            var ordinalPosition = 1;
            for (var row : columnsByName.values()) {
                columns.add(new ClassifierDtos.TableColumnItem(
                    null,
                    row.columnName(),
                    buildColumnDataType(row.columnType(), row.columnLength()),
                    buildColumnDescription(row.columnNameDefinition()),
                    null,
                    ordinalPosition++
                ));
            }

            return new ClassifierDtos.TableItem(
                null,
                entityName,
                buildTableDescription(entityName, entityDefinition, systemType),
                systemType,
                columns
            );
        }
    }

    private static final class StoredTableAccumulator {

        private final UUID tableId;
        private final String tableName;
        private final String description;
        private final String systemType;
        private final List<ClassifierDtos.TableColumnItem> columns = new ArrayList<>();

        private StoredTableAccumulator(UUID tableId, String tableName, String description, String systemType) {
            this.tableId = tableId;
            this.tableName = tableName;
            this.description = description;
            this.systemType = systemType;
        }

        private void addColumn(StoredClassifierTableRow row) {
            var columnName = trim(row.columnName());
            if (columnName == null) {
                return;
            }

            columns.add(new ClassifierDtos.TableColumnItem(
                row.columnId(),
                columnName,
                row.dataType(),
                trim(row.columnDescription()),
                row.nullable(),
                row.ordinalPosition() == null ? columns.size() + 1 : row.ordinalPosition()
            ));
        }

        private ClassifierDtos.TableItem toTableItem() {
            return new ClassifierDtos.TableItem(
                tableId,
                tableName,
                description,
                systemType,
                columns
            );
        }

        private static String trim(String value) {
            if (value == null) {
                return null;
            }

            var normalized = value.trim();
            return normalized.isBlank() ? null : normalized;
        }
    }
}

