package uz.logicalcontrol.backend.service;

import jakarta.persistence.EntityNotFoundException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.logicalcontrol.backend.payload.ControlDtos;
import uz.logicalcontrol.backend.entity.ChangeLogEntity;
import uz.logicalcontrol.backend.entity.ExecutionLogEntity;
import uz.logicalcontrol.backend.entity.LogicalControlEntity;
import uz.logicalcontrol.backend.entity.LogicalControlOverviewEntity;
import uz.logicalcontrol.backend.entity.LogicalRuleEntity;
import uz.logicalcontrol.backend.repository.ChangeLogRepository;
import uz.logicalcontrol.backend.repository.ExecutionLogRepository;
import uz.logicalcontrol.backend.repository.LogicalControlOverviewRepository;
import uz.logicalcontrol.backend.repository.LogicalControlRepository;

@Service
@RequiredArgsConstructor
public class LogicalControlService {

    private static final List<String> REQUIRED_MESSAGE_KEYS = List.of("uzCyrl", "uzLatn", "ru", "en");
    private static final ZoneId CONTROL_NUMBER_ZONE = ZoneId.of("Asia/Tashkent");
    private static final String DEFAULT_CONTROL_NAME = "Yangi mantiqiy nazorat";
    private static final String DEFAULT_SYSTEM_NAME = "Yukli avtotransport (AT)";
    private static final String DEFAULT_PROCESS_STAGE = "Verifikatsiyadan o'tkazish";
    private static final String DEFAULT_RESPONSIBLE_DEPARTMENT =
        "Bojxona nazorati va rasmiylashtiruvini tashkil etish boshqarmasi";
    private static final String DEFAULT_CONFIDENTIALITY_LEVEL = "Maxfiy emas";
    private static final int DEFAULT_PRIORITY_ORDER = 1;
    private static final int DEFAULT_VERSION_NUMBER = 1;
    private static final int DEFAULT_TIMEOUT_MS = 3000;
    private static final long DEFAULT_LAST_EXECUTION_DURATION_MS = 0L;
    private static final int DEFAULT_AUTO_CANCEL_AFTER_DAYS = 90;

    private final LogicalControlRepository logicalControlRepository;
    private final LogicalControlOverviewRepository logicalControlOverviewRepository;
    private final ExecutionLogRepository executionLogRepository;
    private final ChangeLogRepository changeLogRepository;
    private final JdbcTemplate jdbcTemplate;

    @Transactional(readOnly = true)
    public List<ControlDtos.ControlListItem> list(
        String query,
        String deploymentScope,
        String directionType,
        String systemName,
        String controlType,
        String processStage
    ) {
        return logicalControlRepository.findAllByOrderByUpdatedAtDesc().stream()
            .filter(control -> matchesQuery(control, query))
            .filter(control -> matchesEnum(control.getDeploymentScope(), deploymentScope))
            .filter(control -> matchesEnum(control.getDirectionType(), directionType))
            .filter(control -> matchesText(control.getSystemName(), systemName))
            .filter(control -> matchesEnum(control.getControlType(), controlType))
            .filter(control -> matchesText(control.getProcessStage(), processStage))
            .map(control -> new ControlDtos.ControlListItem(
                control.getId(),
                control.getCode(),
                control.getUniqueNumber(),
                control.getName(),
                control.getSystemName(),
                control.getDeploymentScope(),
                control.getDirectionType(),
                control.getControlType(),
                control.getStatus(),
                control.getProcessStage(),
                control.getConfidentialityLevel(),
                control.getPriorityOrder(),
                control.getVersionNumber(),
                control.getStartDate(),
                control.getFinishDate(),
                control.getRules().size(),
                executionLogRepository.countByControlId(control.getId()),
                control.getUpdatedAt()
            ))
            .toList();
    }

    @Transactional(readOnly = true)
    public ControlDtos.ControlDetail get(UUID id) {
        var control = findControl(id);
        var recentLogs = executionLogRepository.findTop20ByControlIdOrderByInstimeDesc(id).stream()
            .map(this::toExecutionLogItem)
            .toList();
        var changeLogs = changeLogRepository.findTop20ByControlIdOrderByChangedAtDesc(id).stream()
            .map(this::toChangeLogItem)
            .toList();

        return toDetail(control, recentLogs, changeLogs);
    }

    @Transactional(readOnly = true)
    public ControlDtos.BasisFileContent getBasisFile(UUID id) {
        var control = findControl(id);
        if (control.getBasisFileData() == null || control.getBasisFileData().length == 0) {
            throw new EntityNotFoundException("MN asosi fayli topilmadi: " + id);
        }

        return new ControlDtos.BasisFileContent(
            control.getBasisFileName(),
            control.getBasisFileContentType(),
            control.getBasisFileData()
        );
    }

    @Transactional(readOnly = true)
    public ControlDtos.ControlUniqueNumber nextUniqueNumber() {
        return new ControlDtos.ControlUniqueNumber(peekNextUniqueNumber());
    }

    @Transactional
    public ControlDtos.ControlDetail createOverview(
        ControlDtos.ControlOverviewRequest request,
        Authentication authentication
    ) {
        var actorName = actorName(authentication);
        var uniqueNumber = allocateNextUniqueNumber();
        var control = new LogicalControlEntity();

        control.setUniqueNumber(uniqueNumber);
        control.setCode(uniqueNumber);
        applyOverviewRequest(control, request, actorName);
        validateDateRange(control.getStartDate(), control.getFinishDate());
        ensureDefaultFields(control, actorName);

        var saved = logicalControlRepository.save(control);
        syncOverview(saved);
        appendChangeLog(saved, actorName, "OVERVIEW_CREATED", Map.of(
            "code", saved.getCode(),
            "uniqueNumber", saved.getUniqueNumber()
        ));

        return get(saved.getId());
    }

    @Transactional
    public ControlDtos.ControlDetail updateOverview(
        UUID id,
        ControlDtos.ControlOverviewRequest request,
        Authentication authentication
    ) {
        var actorName = actorName(authentication);
        var control = findControl(id);

        if (trimToNull(control.getUniqueNumber()) == null) {
            var uniqueNumber = allocateNextUniqueNumber();
            control.setUniqueNumber(uniqueNumber);
            if (trimToNull(control.getCode()) == null) {
                control.setCode(uniqueNumber);
            }
        }

        applyOverviewRequest(control, request, actorName);
        validateDateRange(control.getStartDate(), control.getFinishDate());
        ensureDefaultFields(control, actorName);

        logicalControlRepository.save(control);
        syncOverview(control);
        appendChangeLog(control, actorName, "OVERVIEW_UPDATED", Map.of(
            "code", control.getCode(),
            "uniqueNumber", control.getUniqueNumber()
        ));

        return get(control.getId());
    }

    @Transactional
    public ControlDtos.ControlDetail create(ControlDtos.ControlRequest request, Authentication authentication) {
        var actorName = actorName(authentication);
        var uniqueNumber = allocateNextUniqueNumber();
        var code = uniqueNumber;

        validateUniqueFields(code, uniqueNumber, null);

        var control = new LogicalControlEntity();
        applyRequest(control, request, code, uniqueNumber, actorName);
        validateDateRange(control.getStartDate(), control.getFinishDate());
        ensureDefaultFields(control, actorName);

        var saved = logicalControlRepository.save(control);
        syncOverview(saved);
        appendChangeLog(saved, actorName, "CREATED", Map.of(
            "code", saved.getCode(),
            "version", saved.getVersionNumber()
        ));

        return get(saved.getId());
    }

    @Transactional
    public ControlDtos.ControlDetail update(UUID id, ControlDtos.ControlRequest request, Authentication authentication) {
        var actorName = actorName(authentication);
        var control = findControl(id);
        var uniqueNumber = trimToNull(control.getUniqueNumber()) == null
            ? allocateNextUniqueNumber()
            : control.getUniqueNumber().trim();
        var code = trimToNull(control.getCode()) == null ? uniqueNumber : control.getCode().trim();

        validateUniqueFields(code, uniqueNumber, id);

        applyRequest(control, request, code, uniqueNumber, actorName);
        validateDateRange(control.getStartDate(), control.getFinishDate());
        ensureDefaultFields(control, actorName);

        logicalControlRepository.save(control);
        syncOverview(control);
        appendChangeLog(control, actorName, "UPDATED", Map.of(
            "code", control.getCode(),
            "version", control.getVersionNumber()
        ));

        return get(control.getId());
    }

    @Transactional
    public ControlDtos.ControlDetail duplicate(UUID id, Authentication authentication) {
        var source = findControl(id);
        var uniqueNumber = allocateNextUniqueNumber();
        var duplicate = LogicalControlEntity.builder()
            .code(uniqueNumber)
            .name(source.getName() + " copy")
            .objective(source.getObjective())
            .basis(source.getBasis())
            .tableName(source.getTableName())
            .basisFileName(source.getBasisFileName())
            .basisFileContentType(source.getBasisFileContentType())
            .basisFileSize(source.getBasisFileSize())
            .basisFileData(source.getBasisFileData() == null ? null : source.getBasisFileData().clone())
            .systemName(source.getSystemName())
            .approvers(new ArrayList<>(source.getApprovers()))
            .startDate(source.getStartDate())
            .finishDate(source.getFinishDate())
            .uniqueNumber(uniqueNumber)
            .controlType(source.getControlType())
            .processStage(source.getProcessStage())
            .authorName(source.getAuthorName())
            .responsibleDepartment(source.getResponsibleDepartment())
            .status(LogicalControlEntity.ControlStatus.SUSPENDED)
            .suspendedUntil(source.getSuspendedUntil())
            .messages(new LinkedHashMap<>(source.getMessages()))
            .phoneExtension(source.getPhoneExtension())
            .priorityOrder(source.getPriorityOrder())
            .confidentialityLevel(source.getConfidentialityLevel())
            .smsNotificationEnabled(source.isSmsNotificationEnabled())
            .smsPhones(new ArrayList<>(source.getSmsPhones()))
            .deploymentScope(source.getDeploymentScope())
            .directionType(source.getDirectionType())
            .versionNumber(Optional.ofNullable(source.getVersionNumber()).orElse(DEFAULT_VERSION_NUMBER) + 1)
            .timeoutMs(source.getTimeoutMs())
            .lastExecutionDurationMs(source.getLastExecutionDurationMs())
            .territories(new ArrayList<>(source.getTerritories()))
            .posts(new ArrayList<>(source.getPosts()))
            .autoCancelAfterDays(source.getAutoCancelAfterDays())
            .conflictMonitoringEnabled(source.isConflictMonitoringEnabled())
            .copiedFromControlId(source.getId())
            .ruleBuilderCanvas(new LinkedHashMap<>(source.getRuleBuilderCanvas()))
            .build();

        source.getRules().forEach(rule -> duplicate.getRules().add(LogicalRuleEntity.builder()
            .control(duplicate)
            .name(rule.getName())
            .description(rule.getDescription())
            .sortOrder(rule.getSortOrder())
            .active(rule.isActive())
            .ruleType(rule.getRuleType())
            .definition(new LinkedHashMap<>(rule.getDefinition()))
            .visual(new LinkedHashMap<>(rule.getVisual()))
            .build()));

        validateDateRange(duplicate.getStartDate(), duplicate.getFinishDate());
        var saved = logicalControlRepository.save(duplicate);
        syncOverview(saved);
        appendChangeLog(saved, actorName(authentication), "DUPLICATED", Map.of(
            "sourceId", source.getId().toString(),
            "sourceCode", source.getCode()
        ));

        return get(saved.getId());
    }

    private boolean matchesQuery(LogicalControlEntity control, String query) {
        if (query == null || query.isBlank()) {
            return true;
        }

        var term = query.toLowerCase(Locale.ROOT).trim();
        return containsIgnoreCase(control.getCode(), term)
            || containsIgnoreCase(control.getName(), term)
            || containsIgnoreCase(control.getUniqueNumber(), term)
            || containsIgnoreCase(control.getResponsibleDepartment(), term)
            || containsIgnoreCase(control.getSystemName(), term)
            || containsIgnoreCase(control.getProcessStage(), term);
    }

    private boolean matchesEnum(Enum<?> source, String value) {
        if (value == null || value.isBlank()) {
            return true;
        }

        return source != null && source.name().equalsIgnoreCase(value.trim());
    }

    private boolean matchesText(String source, String value) {
        if (value == null || value.isBlank()) {
            return true;
        }

        return source != null && source.equalsIgnoreCase(value.trim());
    }

    private boolean containsIgnoreCase(String source, String term) {
        return source != null && source.toLowerCase(Locale.ROOT).contains(term);
    }

    private void validateUniqueFields(String code, String uniqueNumber, UUID id) {
        var codeExists = id == null
            ? logicalControlRepository.existsByCodeIgnoreCase(code)
            : logicalControlRepository.existsByCodeIgnoreCaseAndIdNot(code, id);
        if (codeExists) {
            throw new IllegalArgumentException("MN kodi allaqachon mavjud");
        }

        var uniqueExists = id == null
            ? logicalControlRepository.existsByUniqueNumberIgnoreCase(uniqueNumber)
            : logicalControlRepository.existsByUniqueNumberIgnoreCaseAndIdNot(uniqueNumber, id);
        if (uniqueExists) {
            throw new IllegalArgumentException("MN unikal raqami allaqachon mavjud");
        }
    }

    private void validateDateRange(LocalDate startDate, LocalDate finishDate) {
        if (startDate == null || finishDate == null) {
            return;
        }

        if (!startDate.isBefore(finishDate)) {
            throw new IllegalArgumentException("Boshlanish sana yakunlanish sanasidan oldin bo'lishi kerak");
        }
    }

    private LogicalControlEntity findControl(UUID id) {
        return logicalControlRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("MN topilmadi: " + id));
    }

    private void applyRequest(
        LogicalControlEntity control,
        ControlDtos.ControlRequest request,
        String code,
        String uniqueNumber,
        String actorName
    ) {
        control.setCode(code);
        control.setName(defaultIfBlank(request.name(), defaultIfBlank(control.getName(), uniqueNumber)));
        control.setObjective(request.objective());
        control.setBasis(trimToNull(request.basis()));
        control.setTableName(trimToNull(request.tableName()));
        applyBasisFile(control, request);
        control.setSystemName(defaultIfBlank(request.systemName(), defaultIfBlank(control.getSystemName(), DEFAULT_SYSTEM_NAME)));
        control.setApprovers(listOrEmpty(request.approvers()));
        control.setStartDate(request.startDate());
        control.setFinishDate(request.finishDate());
        control.setUniqueNumber(uniqueNumber);
        control.setControlType(Optional.ofNullable(request.controlType()).orElse(LogicalControlEntity.ControlType.BLOCK));
        control.setProcessStage(defaultIfBlank(request.processStage(), DEFAULT_PROCESS_STAGE));
        control.setAuthorName(defaultIfBlank(request.authorName(), defaultAuthorName(actorName)));
        control.setResponsibleDepartment(defaultIfBlank(request.responsibleDepartment(), DEFAULT_RESPONSIBLE_DEPARTMENT));
        control.setStatus(Optional.ofNullable(request.status()).orElse(LogicalControlEntity.ControlStatus.ACTIVE));
        control.setSuspendedUntil(request.suspendedUntil());
        control.setMessages(withRequiredMessageKeys(request.messages()));
        control.setPhoneExtension(trimToNull(request.phoneExtension()));
        control.setPriorityOrder(Optional.ofNullable(request.priorityOrder()).orElse(DEFAULT_PRIORITY_ORDER));
        control.setConfidentialityLevel(defaultIfBlank(request.confidentialityLevel(), DEFAULT_CONFIDENTIALITY_LEVEL));
        control.setSmsNotificationEnabled(Boolean.TRUE.equals(request.smsNotificationEnabled()));
        control.setSmsPhones(Boolean.TRUE.equals(request.smsNotificationEnabled()) ? listOrEmpty(request.smsPhones()) : new ArrayList<>());
        control.setDeploymentScope(Optional.ofNullable(request.deploymentScope()).orElse(LogicalControlEntity.DeploymentScope.INTERNAL));
        control.setDirectionType(
            control.getDeploymentScope() == LogicalControlEntity.DeploymentScope.INTERNAL
                ? Optional.ofNullable(request.directionType()).orElse(LogicalControlEntity.DirectionType.ENTRY)
                : null
        );
        control.setVersionNumber(Optional.ofNullable(request.versionNumber()).orElse(DEFAULT_VERSION_NUMBER));
        control.setTimeoutMs(Optional.ofNullable(request.timeoutMs()).orElse(DEFAULT_TIMEOUT_MS));
        control.setLastExecutionDurationMs(
            Optional.ofNullable(request.lastExecutionDurationMs()).orElse(DEFAULT_LAST_EXECUTION_DURATION_MS)
        );
        control.setTerritories(listOrEmpty(request.territories()));
        control.setPosts(listOrEmpty(request.posts()));
        control.setAutoCancelAfterDays(Optional.ofNullable(request.autoCancelAfterDays()).orElse(DEFAULT_AUTO_CANCEL_AFTER_DAYS));
        control.setConflictMonitoringEnabled(!Boolean.FALSE.equals(request.conflictMonitoringEnabled()));
        control.setCopiedFromControlId(request.copiedFromControlId());
        if (request.ruleBuilderCanvas() != null) {
            control.setRuleBuilderCanvas(mapOrEmpty(request.ruleBuilderCanvas()));
        }

        if (request.rules() != null) {
            control.getRules().clear();
            for (var rule : listOrEmptyRules(request.rules())) {
                control.getRules().add(LogicalRuleEntity.builder()
                    .control(control)
                    .name(rule.name())
                    .description(rule.description())
                    .sortOrder(Optional.ofNullable(rule.sortOrder()).orElse(0))
                    .active(!Boolean.FALSE.equals(rule.active()))
                    .ruleType(rule.ruleType())
                    .definition(mapOrEmpty(rule.definition()))
                    .visual(mapOrEmpty(rule.visual()))
                    .build());
            }
        }
    }

    private void applyOverviewRequest(
        LogicalControlEntity control,
        ControlDtos.ControlOverviewRequest request,
        String actorName
    ) {
        control.setName(defaultIfBlank(request.name(), defaultIfBlank(control.getName(), DEFAULT_CONTROL_NAME)));
        control.setObjective(request.objective());
        control.setBasis(trimToNull(request.basis()));
        control.setTableName(trimToNull(request.tableName()));
        applyBasisFile(control, request);
        control.setSystemName(defaultIfBlank(request.systemName(), defaultIfBlank(control.getSystemName(), DEFAULT_SYSTEM_NAME)));
        control.setStartDate(request.startDate());
        control.setFinishDate(request.finishDate());
        control.setControlType(Optional.ofNullable(request.controlType()).orElse(
            Optional.ofNullable(control.getControlType()).orElse(LogicalControlEntity.ControlType.BLOCK)
        ));
        control.setProcessStage(defaultIfBlank(request.processStage(), defaultIfBlank(control.getProcessStage(), DEFAULT_PROCESS_STAGE)));
        control.setSmsNotificationEnabled(Boolean.TRUE.equals(request.smsNotificationEnabled()));
        control.setSmsPhones(Boolean.TRUE.equals(request.smsNotificationEnabled()) ? listOrEmpty(request.smsPhones()) : new ArrayList<>());
        control.setDeploymentScope(Optional.ofNullable(request.deploymentScope()).orElse(
            Optional.ofNullable(control.getDeploymentScope()).orElse(LogicalControlEntity.DeploymentScope.INTERNAL)
        ));
        control.setDirectionType(
            control.getDeploymentScope() == LogicalControlEntity.DeploymentScope.INTERNAL
                ? Optional.ofNullable(request.directionType()).orElse(LogicalControlEntity.DirectionType.ENTRY)
                : null
        );
        control.setConfidentialityLevel(defaultIfBlank(
            request.confidentialityLevel(),
            defaultIfBlank(control.getConfidentialityLevel(), DEFAULT_CONFIDENTIALITY_LEVEL)
        ));
        control.setAuthorName(defaultIfBlank(control.getAuthorName(), defaultAuthorName(actorName)));
        control.setResponsibleDepartment(defaultIfBlank(control.getResponsibleDepartment(), DEFAULT_RESPONSIBLE_DEPARTMENT));
    }

    private void applyBasisFile(LogicalControlEntity control, ControlDtos.ControlRequest request) {
        if (Boolean.TRUE.equals(request.basisFileRemoved())) {
            control.setBasisFileName(null);
            control.setBasisFileContentType(null);
            control.setBasisFileSize(null);
            control.setBasisFileData(null);
            return;
        }

        if (request.basisFileBase64() == null || request.basisFileBase64().isBlank()) {
            return;
        }

        var decoded = Base64.getDecoder().decode(request.basisFileBase64());
        control.setBasisFileName(trimToNull(request.basisFileName()));
        control.setBasisFileContentType(trimToNull(request.basisFileContentType()));
        control.setBasisFileSize((long) decoded.length);
        control.setBasisFileData(decoded);
    }

    private void applyBasisFile(LogicalControlEntity control, ControlDtos.ControlOverviewRequest request) {
        if (Boolean.TRUE.equals(request.basisFileRemoved())) {
            control.setBasisFileName(null);
            control.setBasisFileContentType(null);
            control.setBasisFileSize(null);
            control.setBasisFileData(null);
            return;
        }

        if (request.basisFileBase64() == null || request.basisFileBase64().isBlank()) {
            return;
        }

        var decoded = Base64.getDecoder().decode(request.basisFileBase64());
        control.setBasisFileName(trimToNull(request.basisFileName()));
        control.setBasisFileContentType(trimToNull(request.basisFileContentType()));
        control.setBasisFileSize((long) decoded.length);
        control.setBasisFileData(decoded);
    }

    private void appendChangeLog(LogicalControlEntity control, String actor, String action, Map<String, Object> details) {
        changeLogRepository.save(ChangeLogEntity.builder()
            .control(control)
            .actor(actor)
            .action(action)
            .changedAt(Instant.now())
            .details(new LinkedHashMap<>(details))
            .build());
    }

    private ControlDtos.ControlDetail toDetail(
        LogicalControlEntity control,
        List<ControlDtos.ExecutionLogItem> recentLogs,
        List<ControlDtos.ChangeLogItem> changeLogs
    ) {
        return new ControlDtos.ControlDetail(
            control.getId(),
            control.getCode(),
            control.getName(),
            control.getObjective(),
            defaultIfBlank(control.getBasis(), ""),
            defaultIfBlank(control.getTableName(), ""),
            control.getBasisFileName(),
            control.getBasisFileContentType(),
            control.getBasisFileSize(),
            null,
            false,
            control.getBasisFileData() != null && control.getBasisFileData().length > 0,
            control.getSystemName(),
            listOrEmpty(control.getApprovers()),
            control.getStartDate(),
            control.getFinishDate(),
            control.getUniqueNumber(),
            control.getControlType(),
            control.getProcessStage(),
            control.getAuthorName(),
            control.getResponsibleDepartment(),
            control.getStatus(),
            control.getSuspendedUntil(),
            mapOrEmpty(control.getMessages()),
            control.getPhoneExtension(),
            control.getPriorityOrder(),
            control.getConfidentialityLevel(),
            control.isSmsNotificationEnabled(),
            listOrEmpty(control.getSmsPhones()),
            control.getDeploymentScope(),
            control.getDirectionType(),
            control.getVersionNumber(),
            control.getTimeoutMs(),
            control.getLastExecutionDurationMs(),
            listOrEmpty(control.getTerritories()),
            listOrEmpty(control.getPosts()),
            control.getAutoCancelAfterDays(),
            control.isConflictMonitoringEnabled(),
            control.getCopiedFromControlId(),
            mapOrEmpty(control.getRuleBuilderCanvas()),
            control.getRules().stream().map(rule -> new ControlDtos.RuleItem(
                rule.getId(),
                rule.getName(),
                rule.getDescription(),
                rule.getSortOrder(),
                rule.isActive(),
                rule.getRuleType(),
                mapOrEmpty(rule.getDefinition()),
                mapOrEmpty(rule.getVisual())
            )).toList(),
            recentLogs,
            changeLogs,
            control.getCreatedAt(),
            control.getUpdatedAt()
        );
    }

    private void syncOverview(LogicalControlEntity control) {
        var overview = logicalControlOverviewRepository.findById(control.getId())
            .orElseGet(() -> LogicalControlOverviewEntity.builder().controlId(control.getId()).build());

        overview.setUniqueNumber(control.getUniqueNumber());
        overview.setName(control.getName());
        overview.setObjective(control.getObjective());
        overview.setBasis(control.getBasis());
        overview.setTableName(control.getTableName());
        overview.setBasisFileName(control.getBasisFileName());
        overview.setBasisFileContentType(control.getBasisFileContentType());
        overview.setBasisFileSize(control.getBasisFileSize());
        overview.setBasisFileData(control.getBasisFileData() == null ? null : control.getBasisFileData().clone());
        overview.setSystemName(control.getSystemName());
        overview.setStartDate(control.getStartDate());
        overview.setFinishDate(control.getFinishDate());
        overview.setControlType(control.getControlType());
        overview.setProcessStage(control.getProcessStage());
        overview.setSmsNotificationEnabled(control.isSmsNotificationEnabled());
        overview.setSmsPhones(listOrEmpty(control.getSmsPhones()));
        overview.setDeploymentScope(control.getDeploymentScope());
        overview.setDirectionType(control.getDirectionType());
        overview.setConfidentialityLevel(control.getConfidentialityLevel());

        logicalControlOverviewRepository.save(overview);
    }

    private void ensureDefaultFields(LogicalControlEntity control, String actorName) {
        if (trimToNull(control.getUniqueNumber()) == null) {
            control.setUniqueNumber(allocateNextUniqueNumber());
        }
        if (trimToNull(control.getCode()) == null) {
            control.setCode(control.getUniqueNumber());
        }
        if (trimToNull(control.getName()) == null) {
            control.setName(defaultIfBlank(control.getUniqueNumber(), DEFAULT_CONTROL_NAME));
        }
        if (trimToNull(control.getSystemName()) == null) {
            control.setSystemName(DEFAULT_SYSTEM_NAME);
        }
        if (control.getControlType() == null) {
            control.setControlType(LogicalControlEntity.ControlType.BLOCK);
        }
        if (trimToNull(control.getProcessStage()) == null) {
            control.setProcessStage(DEFAULT_PROCESS_STAGE);
        }
        if (trimToNull(control.getAuthorName()) == null) {
            control.setAuthorName(defaultAuthorName(actorName));
        }
        if (trimToNull(control.getResponsibleDepartment()) == null) {
            control.setResponsibleDepartment(DEFAULT_RESPONSIBLE_DEPARTMENT);
        }
        if (control.getStatus() == null) {
            control.setStatus(LogicalControlEntity.ControlStatus.ACTIVE);
        }
        control.setMessages(withRequiredMessageKeys(control.getMessages()));
        if (control.getApprovers() == null) {
            control.setApprovers(new ArrayList<>());
        }
        if (control.getPriorityOrder() == null) {
            control.setPriorityOrder(DEFAULT_PRIORITY_ORDER);
        }
        if (trimToNull(control.getConfidentialityLevel()) == null) {
            control.setConfidentialityLevel(DEFAULT_CONFIDENTIALITY_LEVEL);
        }
        if (control.getSmsPhones() == null) {
            control.setSmsPhones(new ArrayList<>());
        }
        if (control.getDeploymentScope() == null) {
            control.setDeploymentScope(LogicalControlEntity.DeploymentScope.INTERNAL);
        }
        if (control.getDeploymentScope() == LogicalControlEntity.DeploymentScope.INTERNAL && control.getDirectionType() == null) {
            control.setDirectionType(LogicalControlEntity.DirectionType.ENTRY);
        }
        if (control.getVersionNumber() == null) {
            control.setVersionNumber(DEFAULT_VERSION_NUMBER);
        }
        if (control.getTimeoutMs() == null) {
            control.setTimeoutMs(DEFAULT_TIMEOUT_MS);
        }
        if (control.getLastExecutionDurationMs() == null) {
            control.setLastExecutionDurationMs(DEFAULT_LAST_EXECUTION_DURATION_MS);
        }
        if (control.getTerritories() == null) {
            control.setTerritories(new ArrayList<>());
        }
        if (control.getPosts() == null) {
            control.setPosts(new ArrayList<>());
        }
        if (control.getAutoCancelAfterDays() == null) {
            control.setAutoCancelAfterDays(DEFAULT_AUTO_CANCEL_AFTER_DAYS);
        }
        if (control.getRuleBuilderCanvas() == null) {
            control.setRuleBuilderCanvas(new LinkedHashMap<>());
        }
    }

    private Map<String, String> withRequiredMessageKeys(Map<String, String> messages) {
        var normalized = new LinkedHashMap<String, String>();
        for (var key : REQUIRED_MESSAGE_KEYS) {
            normalized.put(key, "");
        }
        if (messages != null) {
            messages.forEach((key, value) -> normalized.put(key, value == null ? "" : value));
        }
        return normalized;
    }

    private ControlDtos.ExecutionLogItem toExecutionLogItem(ExecutionLogEntity log) {
        return new ControlDtos.ExecutionLogItem(
            log.getId(),
            log.getInstime(),
            log.getResult(),
            log.getDeclarationId(),
            log.getDeclarationUncodId(),
            log.getDurationMs(),
            log.getMatchedRuleName(),
            mapOrEmpty(log.getDetails())
        );
    }

    private ControlDtos.ChangeLogItem toChangeLogItem(ChangeLogEntity log) {
        return new ControlDtos.ChangeLogItem(
            log.getId(),
            log.getActor(),
            log.getAction(),
            log.getChangedAt(),
            mapOrEmpty(log.getDetails())
        );
    }

    private List<String> listOrEmpty(List<String> value) {
        return value == null ? new ArrayList<>() : new ArrayList<>(value);
    }

    private List<ControlDtos.RuleItem> listOrEmptyRules(List<ControlDtos.RuleItem> value) {
        return value == null ? List.of() : value;
    }

    private <T> Map<String, T> mapOrEmpty(Map<String, T> value) {
        return value == null ? new LinkedHashMap<>() : new LinkedHashMap<>(value);
    }

    private String actorName(Authentication authentication) {
        return authentication == null ? "system" : authentication.getName();
    }

    private String defaultAuthorName(String actorName) {
        return defaultIfBlank(actorName, "system");
    }

    private String defaultIfBlank(String value, String fallback) {
        var normalized = trimToNull(value);
        return normalized == null ? fallback : normalized;
    }

    private String peekNextUniqueNumber() {
        var currentYear = currentYear();
        var nextValue = jdbcTemplate.query(
            "select last_value from logical_control_number_sequences where sequence_year = ?",
            resultSet -> resultSet.next() ? resultSet.getInt("last_value") + 1 : 1,
            currentYear
        );

        return formatUniqueNumber(currentYear, nextValue == null ? 1 : nextValue);
    }

    private String allocateNextUniqueNumber() {
        var currentYear = currentYear();
        var nextValue = jdbcTemplate.queryForObject(
            """
                insert into logical_control_number_sequences(sequence_year, last_value)
                values (?, 1)
                on conflict (sequence_year)
                do update set last_value = logical_control_number_sequences.last_value + 1
                returning last_value
                """,
            Integer.class,
            currentYear
        );

        return formatUniqueNumber(currentYear, nextValue == null ? 1 : nextValue);
    }

    private int currentYear() {
        return LocalDate.now(CONTROL_NUMBER_ZONE).getYear();
    }

    private String formatUniqueNumber(int year, int serial) {
        return "LC" + year + String.format("%07d", serial);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        var normalized = value.trim();
        return normalized.isBlank() ? null : normalized;
    }
}
