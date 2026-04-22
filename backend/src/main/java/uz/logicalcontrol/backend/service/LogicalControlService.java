package uz.logicalcontrol.backend.service;

import jakarta.persistence.EntityNotFoundException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.logicalcontrol.backend.entity.ChangeLogEntity;
import uz.logicalcontrol.backend.entity.ClassifierDepartmentEntity;
import uz.logicalcontrol.backend.entity.ClassifierStateEntity;
import uz.logicalcontrol.backend.entity.ExecutionLogEntity;
import uz.logicalcontrol.backend.entity.LogicalControlApproverDepartmentEntity;
import uz.logicalcontrol.backend.entity.LogicalControlChangeHistoryEntity;
import uz.logicalcontrol.backend.entity.LogicalControlConditionEntity;
import uz.logicalcontrol.backend.entity.LogicalControlEntity;
import uz.logicalcontrol.backend.entity.LogicalControlOverviewEntity;
import uz.logicalcontrol.backend.entity.LogicalRuleEntity;
import uz.logicalcontrol.backend.entity.LogicalControlStateHistoryEntity;
import uz.logicalcontrol.backend.entity.LogicalControlVerificationConfigEntity;
import uz.logicalcontrol.backend.entity.LogicalControlVerificationRuleEntity;
import uz.logicalcontrol.backend.entity.LogicalControlWarningConfigEntity;
import uz.logicalcontrol.backend.entity.LogicalControlWarningMessageEntity;
import uz.logicalcontrol.backend.payload.ControlDtos;
import uz.logicalcontrol.backend.repository.ClassifierDepartmentRepository;
import uz.logicalcontrol.backend.repository.ClassifierStateRepository;
import uz.logicalcontrol.backend.repository.ChangeLogRepository;
import uz.logicalcontrol.backend.repository.ExecutionLogRepository;
import uz.logicalcontrol.backend.repository.LogicalControlChangeHistoryRepository;
import uz.logicalcontrol.backend.repository.LogicalControlOverviewRepository;
import uz.logicalcontrol.backend.repository.LogicalControlRepository;
import uz.logicalcontrol.backend.repository.UserRepository;
import uz.logicalcontrol.backend.security.SecurityActorResolver;

@Service
@RequiredArgsConstructor
public class LogicalControlService {

    private static final List<String> REQUIRED_MESSAGE_KEYS = List.of("UZ", "OZ", "RU", "EN");
    private static final ZoneId CONTROL_NUMBER_ZONE = ZoneId.of("Asia/Tashkent");
    private static final String DEFAULT_CONTROL_NAME = "Yangi mantiqiy nazorat";
    private static final String DEFAULT_SYSTEM_NAME = "Yukli avtotransport (AT)";
    private static final String DEFAULT_PROCESS_STAGE = "Verifikatsiyadan o'tkazish";
    private static final String DEFAULT_RESPONSIBLE_DEPARTMENT =
        "Bojxona nazorati va rasmiylashtiruvini tashkil etish boshqarmasi";
    private static final String DEFAULT_STATE_CODE = "NEW";
    private static final String BUILDER_SAVED_STATE_CODE = "SAVED";
    private static final String DEFAULT_STATE_LANG = "OZ";
    private static final String CONFIDENTIALITY_LEVEL_CONFIDENTIAL = "CONFIDENTIAL";
    private static final String CONFIDENTIALITY_LEVEL_NON_CONFIDENTIAL = "NON_CONFIDENTIAL";
    private static final String DEFAULT_CONFIDENTIALITY_LEVEL = CONFIDENTIALITY_LEVEL_NON_CONFIDENTIAL;
    private static final int DEFAULT_PRIORITY_ORDER = 1;
    private static final int DEFAULT_VERSION_NUMBER = 1;
    private static final int DEFAULT_TIMEOUT_MS = 3000;
    private static final long DEFAULT_LAST_EXECUTION_DURATION_MS = 0L;
    private static final int DEFAULT_AUTO_CANCEL_AFTER_DAYS = 90;
    private static final Duration FIELD_CHANGE_DUPLICATE_WINDOW = Duration.ofSeconds(30);
    private static final String VERIFICATION_RULES_KEY = "verificationRules";
    private static final String COMPLEX_CONDITIONS_KEY = "complexConditions";
    private static final String VERIFICATION_TRIGGER_MODE_KEY = "verificationTriggerMode";
    private static final String BUILDER_CONDITION_MODE_KEY = "conditionViewMode";

    private final LogicalControlRepository logicalControlRepository;
    private final LogicalControlOverviewRepository logicalControlOverviewRepository;
    private final ExecutionLogRepository executionLogRepository;
    private final ChangeLogRepository changeLogRepository;
    private final LogicalControlChangeHistoryRepository logicalControlChangeHistoryRepository;
    private final ClassifierDepartmentRepository classifierDepartmentRepository;
    private final ClassifierStateRepository classifierStateRepository;
    private final UserRepository userRepository;
    private final JdbcTemplate jdbcTemplate;
    private final SecurityActorResolver securityActorResolver;

    @Transactional(readOnly = true)
    public List<ControlDtos.ControlListItem> list(
        String query,
        String deploymentScope,
        String directionType,
        String systemName,
        String controlType,
        String processStage
    ) {
        return logicalControlRepository.findAllByOrderByUpdTimeDesc().stream()
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
                defaultIfBlank(control.getCurrentStateCode(), DEFAULT_STATE_CODE),
                trimToNull(control.getCurrentStateName()),
                control.getSystemName(),
                control.getDeploymentScope(),
                control.getDirectionType(),
                control.getControlType(),
                control.getStatus(),
                control.getProcessStage(),
                normalizeConfidentialityLevel(control.getConfidentialityLevel()),
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
        var control = findControlForUpdate(id);
        var recentLogs = executionLogRepository.findTop20ByControlIdOrderByInstimeDesc(id).stream()
            .map(this::toExecutionLogItem)
            .toList();
        var changeLogs = changeLogRepository.findTop20ByControlIdOrderByChangedAtDesc(id).stream()
            .map(this::toChangeLogItem)
            .toList();
        var rawFieldChangeLogs = collapseDuplicateFieldChanges(
            logicalControlChangeHistoryRepository.findTop200ByControlIdOrderByChangedAtDesc(id)
        );
        var actorDisplayNames = resolveActorDisplayNames(rawFieldChangeLogs);
        var fieldChangeLogs = rawFieldChangeLogs.stream()
            .map(log -> toFieldChangeItem(log, actorDisplayNames))
            .toList();

        return toDetail(control, recentLogs, changeLogs, fieldChangeLogs);
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
        var control = findControlForUpdate(id);
        var shouldTrackDetailedChanges = shouldTrackDetailedChanges(control);
        var beforeChangeSnapshot = shouldTrackDetailedChanges ? buildDetailedChangeSnapshot(control) : Map.<String, String>of();

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
        var detailedChanges = shouldTrackDetailedChanges
            ? buildFieldChangeHistory(control, actorName, beforeChangeSnapshot)
            : List.<LogicalControlChangeHistoryEntity>of();
        detailedChanges = deduplicateFieldChangeHistory(control, detailedChanges);

        logicalControlRepository.save(control);
        if (!detailedChanges.isEmpty()) {
            logicalControlChangeHistoryRepository.saveAll(detailedChanges);
        }
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
        transitionControlState(control, BUILDER_SAVED_STATE_CODE);
        validateDateRange(control.getStartDate(), control.getFinishDate());
        ensureDefaultFields(control, actorName);
        validateBuilderConfiguration(control);
        syncBuilderChildren(control);

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
        var shouldTrackDetailedChanges = shouldTrackDetailedChanges(control);
        var beforeChangeSnapshot = shouldTrackDetailedChanges ? buildDetailedChangeSnapshot(control) : Map.<String, String>of();
        var uniqueNumber = trimToNull(control.getUniqueNumber()) == null
            ? allocateNextUniqueNumber()
            : control.getUniqueNumber().trim();
        var code = trimToNull(control.getCode()) == null ? uniqueNumber : control.getCode().trim();

        validateUniqueFields(code, uniqueNumber, id);

        applyRequest(control, request, code, uniqueNumber, actorName);
        transitionControlState(control, BUILDER_SAVED_STATE_CODE);
        validateDateRange(control.getStartDate(), control.getFinishDate());
        ensureDefaultFields(control, actorName);
        validateBuilderConfiguration(control);
        syncBuilderChildren(control);
        var detailedChanges = shouldTrackDetailedChanges
            ? buildFieldChangeHistory(control, actorName, beforeChangeSnapshot)
            : List.<LogicalControlChangeHistoryEntity>of();
        detailedChanges = deduplicateFieldChangeHistory(control, detailedChanges);

        logicalControlRepository.save(control);
        if (!detailedChanges.isEmpty()) {
            logicalControlChangeHistoryRepository.saveAll(detailedChanges);
        }
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
        var actorName = actorName(authentication);
        var uniqueNumber = allocateNextUniqueNumber();
        var approverDepartments = currentApproverDepartments(source);
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
            .approvers(approverDepartments.stream()
                .map(ApproverDepartmentDraft::departmentName)
                .collect(java.util.stream.Collectors.toCollection(ArrayList::new)))
            .startDate(source.getStartDate())
            .finishDate(source.getFinishDate())
            .uniqueNumber(uniqueNumber)
            .controlType(source.getControlType())
            .processStage(source.getProcessStage())
            .authorName(defaultAuthorName(actorName))
            .responsibleDepartment(source.getResponsibleDepartment())
            .status(LogicalControlEntity.ControlStatus.SUSPENDED)
            .suspendedUntil(source.getSuspendedUntil())
            .messages(new LinkedHashMap<>(source.getMessages()))
            .phoneExtension(source.getPhoneExtension())
            .priorityOrder(source.getPriorityOrder())
            .confidentialityLevel(normalizeConfidentialityLevel(source.getConfidentialityLevel()))
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

        syncApproverDepartmentChildren(duplicate, approverDepartments);
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

        ensureDefaultFields(duplicate, actorName);
        validateDateRange(duplicate.getStartDate(), duplicate.getFinishDate());
        syncBuilderChildren(duplicate);
        var saved = logicalControlRepository.save(duplicate);
        syncOverview(saved);
        appendChangeLog(saved, actorName, "DUPLICATED", Map.of(
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

    private LogicalControlEntity findControlForUpdate(UUID id) {
        return logicalControlRepository.findForUpdateById(id)
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
        syncApproverDepartmentChildren(control, resolveApproverDepartments(request.approverDepartmentIds(), request.approvers()));
        control.setStartDate(request.startDate());
        control.setFinishDate(request.finishDate());
        control.setUniqueNumber(uniqueNumber);
        control.setControlType(Optional.ofNullable(request.controlType()).orElse(LogicalControlEntity.ControlType.BLOCK));
        control.setProcessStage(defaultIfBlank(request.processStage(), DEFAULT_PROCESS_STAGE));
        control.setAuthorName(defaultAuthorName(actorName));
        control.setResponsibleDepartment(defaultIfBlank(request.responsibleDepartment(), DEFAULT_RESPONSIBLE_DEPARTMENT));
        control.setStatus(Optional.ofNullable(request.status()).orElse(LogicalControlEntity.ControlStatus.ACTIVE));
        control.setSuspendedUntil(request.suspendedUntil());
        control.setMessages(withRequiredMessageKeys(request.messages()));
        control.setPhoneExtension(trimToNull(request.phoneExtension()));
        control.setPriorityOrder(Optional.ofNullable(request.priorityOrder()).orElse(DEFAULT_PRIORITY_ORDER));
        control.setConfidentialityLevel(normalizeConfidentialityLevel(request.confidentialityLevel()));
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
        syncApproverDepartmentChildren(control, resolveApproverDepartments(request.approverDepartmentIds(), control.getApprovers()));
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
        control.setConfidentialityLevel(normalizeConfidentialityLevel(defaultIfBlank(
            request.confidentialityLevel(),
            defaultIfBlank(control.getConfidentialityLevel(), DEFAULT_CONFIDENTIALITY_LEVEL)
        )));
        control.setAuthorName(defaultAuthorName(actorName));
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

    private boolean shouldTrackDetailedChanges(LogicalControlEntity control) {
        var currentStateCode = trimToNull(control.getCurrentStateCode());
        if (currentStateCode == null) {
            var latestHistory = latestStateHistory(control);
            currentStateCode = latestHistory == null ? null : latestHistory.getStateCode();
        }

        return !DEFAULT_STATE_CODE.equalsIgnoreCase(normalizeStateCode(currentStateCode));
    }

    private List<LogicalControlChangeHistoryEntity> buildFieldChangeHistory(
        LogicalControlEntity control,
        String actorName,
        Map<String, String> beforeSnapshot
    ) {
        var afterSnapshot = buildDetailedChangeSnapshot(control);
        var changedAt = Instant.now();
        var fieldPaths = new LinkedHashSet<String>();
        fieldPaths.addAll(beforeSnapshot.keySet());
        fieldPaths.addAll(afterSnapshot.keySet());

        var changeHistory = new ArrayList<LogicalControlChangeHistoryEntity>();
        for (var fieldPath : fieldPaths) {
            var oldValue = normalizeDetailedChangeValue(beforeSnapshot.get(fieldPath));
            var newValue = normalizeDetailedChangeValue(afterSnapshot.get(fieldPath));
            if (Objects.equals(oldValue, newValue)) {
                continue;
            }

            changeHistory.add(LogicalControlChangeHistoryEntity.builder()
                .control(control)
                .controlUniqueNumber(defaultIfBlank(control.getUniqueNumber(), control.getCode()))
                .actor(defaultAuthorName(actorName))
                .changedAt(changedAt)
                .fieldPath(fieldPath)
                .oldValue(oldValue)
                .newValue(newValue)
                .build());
        }

        return changeHistory;
    }

    private List<LogicalControlChangeHistoryEntity> deduplicateFieldChangeHistory(
        LogicalControlEntity control,
        List<LogicalControlChangeHistoryEntity> changeHistory
    ) {
        if (changeHistory == null || changeHistory.isEmpty() || control.getId() == null) {
            return changeHistory;
        }

        var latestChangesByFieldPath = new LinkedHashMap<String, LogicalControlChangeHistoryEntity>();
        for (var historyItem : logicalControlChangeHistoryRepository.findTop200ByControlIdOrderByChangedAtDesc(control.getId())) {
            latestChangesByFieldPath.putIfAbsent(normalizeFieldChangePath(historyItem.getFieldPath()), historyItem);
        }

        var deduplicatedHistory = new ArrayList<LogicalControlChangeHistoryEntity>();
        for (var historyItem : changeHistory) {
            var fieldPathKey = normalizeFieldChangePath(historyItem.getFieldPath());
            var latestHistoryItem = latestChangesByFieldPath.get(fieldPathKey);
            if (latestHistoryItem != null && areEquivalentFieldChanges(latestHistoryItem, historyItem)) {
                continue;
            }

            deduplicatedHistory.add(historyItem);
            latestChangesByFieldPath.put(fieldPathKey, historyItem);
        }

        return deduplicatedHistory;
    }

    private List<LogicalControlChangeHistoryEntity> collapseDuplicateFieldChanges(
        List<LogicalControlChangeHistoryEntity> changeHistory
    ) {
        if (changeHistory == null || changeHistory.isEmpty()) {
            return List.of();
        }

        var collapsedHistory = new ArrayList<LogicalControlChangeHistoryEntity>();
        for (var historyItem : changeHistory) {
            var latestCollapsedHistoryItem = collapsedHistory.isEmpty()
                ? null
                : collapsedHistory.get(collapsedHistory.size() - 1);
            if (latestCollapsedHistoryItem != null && areEquivalentFieldChanges(latestCollapsedHistoryItem, historyItem)) {
                continue;
            }

            collapsedHistory.add(historyItem);
        }

        return collapsedHistory;
    }

    private boolean areEquivalentFieldChanges(
        LogicalControlChangeHistoryEntity existingHistoryItem,
        LogicalControlChangeHistoryEntity candidateHistoryItem
    ) {
        if (existingHistoryItem == null || candidateHistoryItem == null) {
            return false;
        }

        if (!Objects.equals(
            normalizeFieldChangePath(existingHistoryItem.getFieldPath()),
            normalizeFieldChangePath(candidateHistoryItem.getFieldPath())
        )) {
            return false;
        }

        if (!Objects.equals(
            normalizeFieldChangeComparisonValue(existingHistoryItem.getFieldPath(), existingHistoryItem.getOldValue()),
            normalizeFieldChangeComparisonValue(candidateHistoryItem.getFieldPath(), candidateHistoryItem.getOldValue())
        )) {
            return false;
        }

        if (!Objects.equals(
            normalizeFieldChangeComparisonValue(existingHistoryItem.getFieldPath(), existingHistoryItem.getNewValue()),
            normalizeFieldChangeComparisonValue(candidateHistoryItem.getFieldPath(), candidateHistoryItem.getNewValue())
        )) {
            return false;
        }

        return isWithinFieldChangeDuplicateWindow(existingHistoryItem.getChangedAt(), candidateHistoryItem.getChangedAt());
    }

    private String normalizeFieldChangePath(String fieldPath) {
        return Optional.ofNullable(trimToNull(fieldPath))
            .map(path -> path.toLowerCase(Locale.ROOT))
            .orElse("");
    }

    private String normalizeFieldChangeComparisonValue(String fieldPath, String value) {
        var normalizedValue = normalizeDetailedChangeValue(value);
        if (normalizedValue == null) {
            return null;
        }

        if ("basisfile".equals(normalizeFieldChangePath(fieldPath))) {
            var separatorIndex = normalizedValue.indexOf("||");
            if (separatorIndex >= 0) {
                return trimToNull(normalizedValue.substring(0, separatorIndex));
            }
        }

        return normalizedValue;
    }

    private boolean isWithinFieldChangeDuplicateWindow(Instant firstChangedAt, Instant secondChangedAt) {
        if (firstChangedAt == null || secondChangedAt == null) {
            return true;
        }

        return Duration.between(firstChangedAt, secondChangedAt).abs().compareTo(FIELD_CHANGE_DUPLICATE_WINDOW) <= 0;
    }

    private Map<String, String> buildDetailedChangeSnapshot(LogicalControlEntity control) {
        var snapshot = new LinkedHashMap<String, String>();
        putDetailedChangeValue(snapshot, "name", control.getName());
        putDetailedChangeValue(snapshot, "objective", control.getObjective());
        putDetailedChangeValue(snapshot, "basis", control.getBasis());
        putDetailedChangeValue(snapshot, "tableName", control.getTableName());
        putDetailedChangeValue(snapshot, "basisFile", serializeBasisFile(control));
        putDetailedChangeValue(snapshot, "systemName", control.getSystemName());
        putDetailedChangeValue(snapshot, "approverDepartments", serializeApproverDepartments(currentApproverDepartments(control)));
        putDetailedChangeValue(snapshot, "startDate", control.getStartDate());
        putDetailedChangeValue(snapshot, "finishDate", control.getFinishDate());
        putDetailedChangeValue(snapshot, "controlType", control.getControlType());
        putDetailedChangeValue(snapshot, "processStage", control.getProcessStage());
        putDetailedChangeValue(snapshot, "suspendedUntil", control.getSuspendedUntil());
        snapshotMessages(snapshot, withRequiredMessageKeys(control.getMessages()));
        putDetailedChangeValue(snapshot, "phoneExtension", control.getPhoneExtension());
        putDetailedChangeValue(snapshot, "priorityOrder", control.getPriorityOrder());
        putDetailedChangeValue(snapshot, "confidentialityLevel", normalizeConfidentialityLevel(control.getConfidentialityLevel()));
        putDetailedChangeValue(snapshot, "smsNotificationEnabled", control.isSmsNotificationEnabled());
        putDetailedChangeValue(snapshot, "smsPhones", listOrEmpty(control.getSmsPhones()));
        putDetailedChangeValue(snapshot, "deploymentScope", control.getDeploymentScope());
        putDetailedChangeValue(snapshot, "directionType", control.getDirectionType());
        putDetailedChangeValue(snapshot, "versionNumber", control.getVersionNumber());
        putDetailedChangeValue(snapshot, "timeoutMs", control.getTimeoutMs());
        putDetailedChangeValue(snapshot, "lastExecutionDurationMs", control.getLastExecutionDurationMs());
        putDetailedChangeValue(snapshot, "territories", listOrEmpty(control.getTerritories()));
        putDetailedChangeValue(snapshot, "posts", listOrEmpty(control.getPosts()));
        putDetailedChangeValue(snapshot, "autoCancelAfterDays", control.getAutoCancelAfterDays());
        putDetailedChangeValue(snapshot, "conflictMonitoringEnabled", control.isConflictMonitoringEnabled());
        putDetailedChangeValue(snapshot, "copiedFromControlId", control.getCopiedFromControlId());

        var canvas = mapOrEmpty(control.getRuleBuilderCanvas());
        putDetailedChangeValue(snapshot, "builder.conditionViewMode", isSimpleBuilderView(canvas) ? "SIMPLE" : "COMPLEX");
        putDetailedChangeValue(snapshot, "builder.verificationTriggerMode", currentVerificationTriggerMode(control, canvas));
        snapshotConditions(snapshot, currentConditionDrafts(control, canvas));
        snapshotVerificationRules(snapshot, currentVerificationRuleDrafts(control, canvas));

        return snapshot;
    }

    private String serializeApproverDepartments(List<ApproverDepartmentDraft> approverDepartments) {
        if (approverDepartments == null || approverDepartments.isEmpty()) {
            return null;
        }

        var serializedDepartments = new ArrayList<String>();
        for (var index = 0; index < approverDepartments.size(); index++) {
            var approverDepartment = approverDepartments.get(index);
            var departmentLabel = defaultIfBlank(
                trimToNull(approverDepartment.departmentName()),
                Optional.ofNullable(approverDepartment.departmentId()).map(UUID::toString).orElse(null)
            );
            if (departmentLabel == null) {
                continue;
            }
            serializedDepartments.add((index + 1) + ". " + departmentLabel);
        }

        return serializedDepartments.isEmpty() ? null : String.join("\n", serializedDepartments);
    }

    private String serializeBasisFile(LogicalControlEntity control) {
        var fileName = trimToNull(control.getBasisFileName());
        var checksum = checksum(control.getBasisFileData());
        if (fileName == null && checksum == null) {
            return null;
        }
        if (fileName == null) {
            return checksum;
        }
        if (checksum == null) {
            return fileName;
        }
        return fileName + "||" + checksum;
    }

    private void snapshotMessages(Map<String, String> snapshot, Map<String, String> messages) {
        for (var localeCode : REQUIRED_MESSAGE_KEYS) {
            putDetailedChangeValue(snapshot, "messages." + localeCode, messages.get(localeCode));
        }
    }

    private void snapshotConditions(Map<String, String> snapshot, List<BuilderConditionDraft> conditions) {
        for (var index = 0; index < conditions.size(); index++) {
            var condition = conditions.get(index);
            var prefix = "conditions[" + (index + 1) + "]";
            putDetailedChangeValue(snapshot, prefix + ".conditionType", condition.conditionType());
            putDetailedChangeValue(snapshot, prefix + ".parameterName", condition.parameterName());
            putDetailedChangeValue(snapshot, prefix + ".serverName", condition.serverName());
            putDetailedChangeValue(snapshot, prefix + ".sqlQuery", condition.sqlQuery());
        }
    }

    private void snapshotVerificationRules(
        Map<String, String> snapshot,
        List<BuilderVerificationRuleDraft> verificationRules
    ) {
        for (var index = 0; index < verificationRules.size(); index++) {
            var verificationRule = verificationRules.get(index);
            var prefix = "verificationRules[" + (index + 1) + "]";
            putDetailedChangeValue(snapshot, prefix + ".joiner", verificationRule.joiner());
            putDetailedChangeValue(snapshot, prefix + ".fieldSource", verificationRule.fieldSource());
            putDetailedChangeValue(snapshot, prefix + ".tableName", verificationRule.tableName());
            putDetailedChangeValue(snapshot, prefix + ".fieldRef", verificationRule.fieldRef());
            putDetailedChangeValue(snapshot, prefix + ".operator", verificationRule.operator());
            putDetailedChangeValue(snapshot, prefix + ".comparisonValue", verificationRule.comparisonValue());
            putDetailedChangeValue(snapshot, prefix + ".secondaryComparisonValue", verificationRule.secondaryComparisonValue());
        }
    }

    private List<BuilderConditionDraft> currentConditionDrafts(
        LogicalControlEntity control,
        Map<String, Object> canvas
    ) {
        if (control.getConditions() != null && !control.getConditions().isEmpty()) {
            return control.getConditions().stream()
                .sorted(Comparator.comparing(condition -> Optional.ofNullable(condition.getSortOrder()).orElse(Integer.MAX_VALUE)))
                .map(condition -> new BuilderConditionDraft(
                    defaultIfBlank(condition.getParameterName(), "param" + Optional.ofNullable(condition.getSortOrder()).orElse(0)),
                    Optional.ofNullable(condition.getSortOrder()).orElse(0),
                    condition.getConditionType(),
                    trimToEmpty(condition.getServerName()),
                    trimToEmpty(condition.getSqlQuery())
                ))
                .toList();
        }

        return parseBuilderConditions(canvas);
    }

    private LogicalControlVerificationConfigEntity.TriggerMode currentVerificationTriggerMode(
        LogicalControlEntity control,
        Map<String, Object> canvas
    ) {
        return Optional.ofNullable(control.getVerificationConfig())
            .map(LogicalControlVerificationConfigEntity::getTriggerMode)
            .orElseGet(() -> parseVerificationTriggerMode(canvas));
    }

    private List<BuilderVerificationRuleDraft> currentVerificationRuleDrafts(
        LogicalControlEntity control,
        Map<String, Object> canvas
    ) {
        var verificationConfig = control.getVerificationConfig();
        if (verificationConfig != null && verificationConfig.getRules() != null && !verificationConfig.getRules().isEmpty()) {
            return verificationConfig.getRules().stream()
                .sorted(Comparator.comparing(rule -> Optional.ofNullable(rule.getSortOrder()).orElse(Integer.MAX_VALUE)))
                .map(rule -> new BuilderVerificationRuleDraft(
                    Optional.ofNullable(rule.getSortOrder()).orElse(0),
                    rule.getJoiner(),
                    rule.getFieldSource(),
                    rule.getTableName(),
                    rule.getFieldRef(),
                    rule.getOperator(),
                    rule.getComparisonValue(),
                    rule.getSecondaryComparisonValue()
                ))
                .toList();
        }

        return parseVerificationRules(canvas, control.getTableName(), isSimpleBuilderView(canvas));
    }

    private void putDetailedChangeValue(Map<String, String> snapshot, String fieldPath, Object value) {
        var serializedValue = serializeDetailedChangeValue(value);
        if (serializedValue != null) {
            snapshot.put(fieldPath, serializedValue);
        }
    }

    private String serializeDetailedChangeValue(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof String textValue) {
            return textValue.isBlank() ? null : textValue;
        }
        if (value instanceof Enum<?> enumValue) {
            return enumValue.name();
        }
        if (value instanceof byte[] byteArrayValue) {
            return checksum(byteArrayValue);
        }
        if (value instanceof List<?> listValue) {
            var serializedItems = listValue.stream()
                .map(this::serializeDetailedChangeValue)
                .filter(Objects::nonNull)
                .toList();
            return serializedItems.isEmpty() ? null : "[" + String.join(", ", serializedItems) + "]";
        }

        return String.valueOf(value);
    }

    private String normalizeDetailedChangeValue(String value) {
        if (value == null) {
            return null;
        }

        return value.isBlank() ? null : value;
    }

    private String checksum(byte[] value) {
        if (value == null || value.length == 0) {
            return null;
        }

        try {
            var digest = MessageDigest.getInstance("SHA-256").digest(value);
            var hex = new StringBuilder(digest.length * 2);
            for (var b : digest) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 algorithm not available", exception);
        }
    }

    private ControlDtos.ControlDetail toDetail(
        LogicalControlEntity control,
        List<ControlDtos.ExecutionLogItem> recentLogs,
        List<ControlDtos.ChangeLogItem> changeLogs,
        List<ControlDtos.FieldChangeItem> fieldChangeLogs
    ) {
        var approverDepartments = currentApproverDepartments(control);
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
            approverDepartments.stream().map(ApproverDepartmentDraft::departmentName).toList(),
            approverDepartments.stream()
                .map(ApproverDepartmentDraft::departmentId)
                .filter(java.util.Objects::nonNull)
                .map(UUID::toString)
                .toList(),
            control.getStartDate(),
            control.getFinishDate(),
            control.getUniqueNumber(),
            control.getControlType(),
            control.getProcessStage(),
            resolveAuthorName(control),
            control.getResponsibleDepartment(),
            control.getStatus(),
            defaultIfBlank(control.getCurrentStateCode(), DEFAULT_STATE_CODE),
            trimToNull(control.getCurrentStateName()),
            control.getSuspendedUntil(),
            mapOrEmpty(control.getMessages()),
            control.getPhoneExtension(),
            control.getPriorityOrder(),
            normalizeConfidentialityLevel(control.getConfidentialityLevel()),
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
            fieldChangeLogs,
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
        overview.setConfidentialityLevel(normalizeConfidentialityLevel(control.getConfidentialityLevel()));

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
        control.setAuthorName(normalizeAuthorNameForPersistence(control.getAuthorName(), actorName));
        if (trimToNull(control.getResponsibleDepartment()) == null) {
            control.setResponsibleDepartment(DEFAULT_RESPONSIBLE_DEPARTMENT);
        }
        if (control.getStatus() == null) {
            control.setStatus(LogicalControlEntity.ControlStatus.ACTIVE);
        }
        ensureCurrentState(control);
        control.setMessages(withRequiredMessageKeys(control.getMessages()));
        if (control.getApprovers() == null) {
            control.setApprovers(new ArrayList<>());
        }
        if (control.getApproverDepartments() == null) {
            control.setApproverDepartments(new ArrayList<>());
        }
        if (control.getStateHistory() == null) {
            control.setStateHistory(new ArrayList<>());
        }
        if (control.getPriorityOrder() == null) {
            control.setPriorityOrder(DEFAULT_PRIORITY_ORDER);
        }
        control.setConfidentialityLevel(normalizeConfidentialityLevel(control.getConfidentialityLevel()));
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

    private void validateBuilderConfiguration(LogicalControlEntity control) {
        var canvas = mapOrEmpty(control.getRuleBuilderCanvas());
        if (!hasStructuredBuilderCanvas(canvas)) {
            return;
        }
        var simpleBuilderView = isSimpleBuilderView(canvas);
        if (!simpleBuilderView) {
            var conditions = parseBuilderConditions(canvas);
            if (conditions.isEmpty()) {
                throw new IllegalArgumentException("Dastlabki shart to'ldirilishi shart");
            }

            for (var condition : conditions) {
                if (trimToNull(condition.serverName()) == null) {
                    throw new IllegalArgumentException(conditionLabel(condition) + " uchun server tanlanishi shart");
                }
                if (trimToNull(condition.sqlQuery()) == null) {
                    throw new IllegalArgumentException(conditionLabel(condition) + " uchun SQL query kiritilishi shart");
                }
            }
        }

        var rules = parseVerificationRules(canvas, control.getTableName(), simpleBuilderView);
        if (rules.isEmpty()) {
            throw new IllegalArgumentException("Tekshirish sharti to'ldirilishi shart");
        }

        for (var rule : rules) {
            if (rule.fieldSource() == LogicalControlVerificationRuleEntity.FieldSource.TABLE && trimToNull(rule.tableName()) == null) {
                throw new IllegalArgumentException(verificationRuleLabel(rule) + " uchun jadval tanlanishi shart");
            }
            if (trimToNull(rule.fieldRef()) == null) {
                throw new IllegalArgumentException(verificationRuleLabel(rule) + " uchun parametr yoki ustun tanlanishi shart");
            }

            if (requiresSecondaryValue(rule.operator())) {
                if (trimToNull(rule.comparisonValue()) == null || trimToNull(rule.secondaryComparisonValue()) == null) {
                    throw new IllegalArgumentException(verificationRuleLabel(rule) + " uchun ikkala qiymat ham kiritilishi shart");
                }
                continue;
            }

            if (requiresPrimaryValue(rule.operator()) && trimToNull(rule.comparisonValue()) == null) {
                throw new IllegalArgumentException(verificationRuleLabel(rule) + " uchun qiymat kiritilishi shart");
            }
        }

        var messages = withRequiredMessageKeys(control.getMessages());
        for (var key : REQUIRED_MESSAGE_KEYS) {
            if (trimToNull(messages.get(key)) == null) {
                throw new IllegalArgumentException("Ogohlantirish xabari (" + warningMessageLabel(key) + ") kiritilishi shart");
            }
        }

        if (trimToNull(control.getPhoneExtension()) == null) {
            throw new IllegalArgumentException("IP telefon raqami kiritilishi shart");
        }
    }

    private void syncBuilderChildren(LogicalControlEntity control) {
        var canvas = mapOrEmpty(control.getRuleBuilderCanvas());
        if (!hasStructuredBuilderCanvas(canvas)) {
            return;
        }
        var simpleBuilderView = isSimpleBuilderView(canvas);
        syncConditionChildren(
            control,
            simpleBuilderView ? List.of() : parseBuilderConditions(canvas)
        );
        syncVerificationChildren(
            control,
            parseVerificationTriggerMode(canvas),
            parseVerificationRules(canvas, control.getTableName(), simpleBuilderView)
        );
        syncWarningChildren(control, withRequiredMessageKeys(control.getMessages()), control.getPhoneExtension());
    }

    private boolean hasStructuredBuilderCanvas(Map<String, Object> canvas) {
        return canvas.containsKey(COMPLEX_CONDITIONS_KEY)
            || canvas.containsKey(VERIFICATION_RULES_KEY)
            || canvas.containsKey(VERIFICATION_TRIGGER_MODE_KEY)
            || canvas.containsKey(BUILDER_CONDITION_MODE_KEY);
    }

    private boolean isSimpleBuilderView(Map<String, Object> canvas) {
        return "simple".equalsIgnoreCase(trimToEmpty(canvas.get(BUILDER_CONDITION_MODE_KEY)));
    }

    private void syncConditionChildren(LogicalControlEntity control, List<BuilderConditionDraft> conditions) {
        control.getConditions().clear();
        conditions.forEach(condition -> control.getConditions().add(LogicalControlConditionEntity.builder()
            .control(control)
            .conditionType(condition.conditionType())
            .parameterName(condition.parameterName())
            .sortOrder(condition.sortOrder())
            .serverName(condition.serverName())
            .sqlQuery(condition.sqlQuery())
            .build()));
    }

    private void syncApproverDepartmentChildren(
        LogicalControlEntity control,
        List<ApproverDepartmentDraft> approverDepartments
    ) {
        var currentDepartments = control.getApproverDepartments();
        var existingByKey = new java.util.LinkedHashMap<String, LogicalControlApproverDepartmentEntity>();
        var duplicateExistingKeys = new java.util.HashSet<String>();
        for (var existingDepartment : currentDepartments) {
            var key = approverDepartmentKey(existingDepartment);
            if (existingByKey.containsKey(key)) {
                duplicateExistingKeys.add(key);
                continue;
            }
            existingByKey.put(key, existingDepartment);
        }

        var desiredKeys = new java.util.LinkedHashSet<String>();
        for (var approverDepartment : approverDepartments) {
            var key = approverDepartmentKey(approverDepartment);
            desiredKeys.add(key);
            var existingDepartment = existingByKey.get(key);
            if (existingDepartment == null) {
                currentDepartments.add(LogicalControlApproverDepartmentEntity.builder()
                    .control(control)
                    .departmentId(approverDepartment.departmentId())
                    .departmentName(approverDepartment.departmentName())
                    .sortOrder(approverDepartment.sortOrder())
                    .build());
                continue;
            }

            existingDepartment.setControl(control);
            existingDepartment.setDepartmentId(approverDepartment.departmentId());
            existingDepartment.setDepartmentName(approverDepartment.departmentName());
            existingDepartment.setSortOrder(approverDepartment.sortOrder());
        }

        var retainedKeys = new java.util.HashSet<String>();
        currentDepartments.removeIf(existingDepartment -> {
            var key = approverDepartmentKey(existingDepartment);
            if (!desiredKeys.contains(key)) {
                return true;
            }
            if (duplicateExistingKeys.contains(key) && retainedKeys.contains(key)) {
                return true;
            }
            return !retainedKeys.add(key);
        });

        control.setApprovers(approverDepartments.stream()
            .map(ApproverDepartmentDraft::departmentName)
            .collect(java.util.stream.Collectors.toCollection(ArrayList::new)));
    }

    private void ensureCurrentState(LogicalControlEntity control) {
        if (control.getStateHistory() == null) {
            control.setStateHistory(new ArrayList<>());
        }
        var currentStateCode = trimToNull(control.getCurrentStateCode());
        var currentStateName = trimToNull(control.getCurrentStateName());
        var currentStateLang = trimToNull(control.getCurrentStateLang());
        if (currentStateCode == null) {
            var latestHistory = latestStateHistory(control);
            if (latestHistory != null && trimToNull(latestHistory.getStateCode()) != null) {
                currentStateCode = latestHistory.getStateCode();
                currentStateName = defaultIfBlank(latestHistory.getStateName(), currentStateCode);
                currentStateLang = defaultIfBlank(latestHistory.getStateLang(), DEFAULT_STATE_LANG);
            } else {
                currentStateCode = DEFAULT_STATE_CODE;
            }
        }

        var stateDescriptor = resolveStateDescriptor(currentStateCode, currentStateName, currentStateLang);
        control.setCurrentStateCode(stateDescriptor.code());
        control.setCurrentStateName(stateDescriptor.name());
        control.setCurrentStateLang(stateDescriptor.langCode());
        ensureStateHistory(control, stateDescriptor);
    }

    private void transitionControlState(LogicalControlEntity control, String stateCode) {
        control.setCurrentStateCode(normalizeStateCode(stateCode));
        control.setCurrentStateName(null);
        control.setCurrentStateLang(null);
    }

    private LogicalControlStateHistoryEntity latestStateHistory(LogicalControlEntity control) {
        if (control.getStateHistory() == null || control.getStateHistory().isEmpty()) {
            return null;
        }

        return control.getStateHistory().getFirst();
    }

    private StateDescriptor resolveStateDescriptor(String stateCode, String fallbackName, String fallbackLang) {
        var normalizedStateCode = normalizeStateCode(stateCode);
        var normalizedLang = defaultIfBlank(normalizeMessageLocaleKey(fallbackLang), DEFAULT_STATE_LANG);
        var candidates = classifierStateRepository.findAllByCodeIgnoreCaseOrderByLangCodeAscNameAsc(normalizedStateCode);
        var preferredState = candidates.stream()
            .filter(ClassifierStateEntity::isActive)
            .filter(candidate -> candidate.getLangCode().equalsIgnoreCase(normalizedLang))
            .findFirst()
            .or(() -> candidates.stream()
                .filter(candidate -> candidate.getLangCode().equalsIgnoreCase(normalizedLang))
                .findFirst())
            .or(() -> candidates.stream().filter(ClassifierStateEntity::isActive).findFirst())
            .or(() -> candidates.stream().findFirst());
        if (preferredState.isPresent()) {
            var classifierState = preferredState.get();
            return new StateDescriptor(
                normalizeStateCode(classifierState.getCode()),
                defaultIfBlank(classifierState.getName(), normalizedStateCode),
                defaultIfBlank(normalizeMessageLocaleKey(classifierState.getLangCode()), DEFAULT_STATE_LANG)
            );
        }

        return new StateDescriptor(
            normalizedStateCode,
            defaultIfBlank(fallbackName, normalizedStateCode),
            normalizedLang
        );
    }

    private void ensureStateHistory(LogicalControlEntity control, StateDescriptor stateDescriptor) {
        var latestHistory = latestStateHistory(control);
        if (latestHistory != null
            && stateDescriptor.code().equalsIgnoreCase(defaultIfBlank(latestHistory.getStateCode(), ""))
            && stateDescriptor.langCode().equalsIgnoreCase(defaultIfBlank(latestHistory.getStateLang(), ""))
            && defaultIfBlank(control.getUniqueNumber(), "").equals(defaultIfBlank(latestHistory.getControlUniqueNumber(), ""))) {
            latestHistory.setControlUniqueNumber(defaultIfBlank(control.getUniqueNumber(), control.getCode()));
            latestHistory.setStateName(stateDescriptor.name());
            return;
        }

        control.getStateHistory().addFirst(LogicalControlStateHistoryEntity.builder()
            .control(control)
            .controlUniqueNumber(defaultIfBlank(control.getUniqueNumber(), control.getCode()))
            .stateCode(stateDescriptor.code())
            .stateName(stateDescriptor.name())
            .stateLang(stateDescriptor.langCode())
            .build());
    }

    private void syncVerificationChildren(
        LogicalControlEntity control,
        LogicalControlVerificationConfigEntity.TriggerMode triggerMode,
        List<BuilderVerificationRuleDraft> rules
    ) {
        var verificationConfig = Optional.ofNullable(control.getVerificationConfig())
            .orElseGet(LogicalControlVerificationConfigEntity::new);
        verificationConfig.setControl(control);
        verificationConfig.setTriggerMode(triggerMode);
        verificationConfig.getRules().clear();
        rules.forEach(rule -> verificationConfig.getRules().add(LogicalControlVerificationRuleEntity.builder()
            .verificationConfig(verificationConfig)
            .sortOrder(rule.sortOrder())
            .joiner(rule.joiner())
            .fieldSource(rule.fieldSource())
            .tableName(rule.tableName())
            .fieldRef(rule.fieldRef())
            .operator(rule.operator())
            .comparisonValue(rule.comparisonValue())
            .secondaryComparisonValue(rule.secondaryComparisonValue())
            .build()));
        control.setVerificationConfig(verificationConfig);
    }

    private void syncWarningChildren(
        LogicalControlEntity control,
        Map<String, String> messages,
        String phoneExtension
    ) {
        var warningConfig = Optional.ofNullable(control.getWarningConfig())
            .orElseGet(LogicalControlWarningConfigEntity::new);
        warningConfig.setControl(control);
        warningConfig.setPhoneExtension(trimToNull(phoneExtension));
        warningConfig.getMessages().clear();

        for (var index = 0; index < REQUIRED_MESSAGE_KEYS.size(); index++) {
            var localeCode = REQUIRED_MESSAGE_KEYS.get(index);
            warningConfig.getMessages().add(LogicalControlWarningMessageEntity.builder()
                .warningConfig(warningConfig)
                .localeCode(localeCode)
                .sortOrder(index + 1)
                .messageText(messages.getOrDefault(localeCode, ""))
                .build());
        }

        control.setWarningConfig(warningConfig);
    }

    private List<BuilderConditionDraft> parseBuilderConditions(Map<String, Object> canvas) {
        var rawConditions = asList(canvas.get(COMPLEX_CONDITIONS_KEY));
        var conditions = new ArrayList<BuilderConditionDraft>();
        for (var index = 0; index < rawConditions.size(); index++) {
            var conditionMap = asMap(rawConditions.get(index));
            var sortOrder = index + 1;
            conditions.add(new BuilderConditionDraft(
                "param" + sortOrder,
                sortOrder,
                sortOrder == 1 ? LogicalControlConditionEntity.ConditionType.INITIAL : LogicalControlConditionEntity.ConditionType.ADDITIONAL,
                trimToEmpty(conditionMap.get("serverName")),
                trimToEmpty(conditionMap.get("sqlQuery"))
            ));
        }
        return conditions;
    }

    private LogicalControlVerificationConfigEntity.TriggerMode parseVerificationTriggerMode(Map<String, Object> canvas) {
        return "FALSE".equalsIgnoreCase(trimToEmpty(canvas.get(VERIFICATION_TRIGGER_MODE_KEY)))
            ? LogicalControlVerificationConfigEntity.TriggerMode.FALSE
            : LogicalControlVerificationConfigEntity.TriggerMode.TRUE;
    }

    private List<BuilderVerificationRuleDraft> parseVerificationRules(
        Map<String, Object> canvas,
        String fallbackTableName,
        boolean simpleBuilderView
    ) {
        var rawRules = asList(canvas.get(VERIFICATION_RULES_KEY));
        var rules = new ArrayList<BuilderVerificationRuleDraft>();
        for (var index = 0; index < rawRules.size(); index++) {
            var ruleMap = asMap(rawRules.get(index));
            var fieldSource = simpleBuilderView
                || "TABLE".equalsIgnoreCase(trimToEmpty(ruleMap.get("fieldSource")))
                ? LogicalControlVerificationRuleEntity.FieldSource.TABLE
                : LogicalControlVerificationRuleEntity.FieldSource.PARAMS;
            var operator = parseVerificationOperator(ruleMap.get("operator"));
            var tableName = fieldSource == LogicalControlVerificationRuleEntity.FieldSource.TABLE
                ? defaultIfBlank(trimToNull(trimToEmpty(ruleMap.get("tableName"))), trimToNull(fallbackTableName))
                : null;
            rules.add(new BuilderVerificationRuleDraft(
                index + 1,
                "OR".equalsIgnoreCase(trimToEmpty(ruleMap.get("joiner")))
                    ? LogicalControlVerificationRuleEntity.Joiner.OR
                    : LogicalControlVerificationRuleEntity.Joiner.AND,
                fieldSource,
                tableName,
                trimToEmpty(ruleMap.get("fieldRef")),
                operator,
                trimToEmpty(ruleMap.get("comparisonValue")),
                trimToEmpty(ruleMap.get("secondaryComparisonValue"))
            ));
        }
        return rules;
    }

    private LogicalControlVerificationRuleEntity.Operator parseVerificationOperator(Object rawOperator) {
        var normalized = trimToEmpty(rawOperator).toUpperCase(Locale.ROOT);
        if (normalized.isEmpty()) {
            return LogicalControlVerificationRuleEntity.Operator.EQ;
        }

        try {
            return LogicalControlVerificationRuleEntity.Operator.valueOf(normalized);
        } catch (IllegalArgumentException exception) {
            return LogicalControlVerificationRuleEntity.Operator.EQ;
        }
    }

    private boolean requiresPrimaryValue(LogicalControlVerificationRuleEntity.Operator operator) {
        return operator != LogicalControlVerificationRuleEntity.Operator.IS_NULL
            && operator != LogicalControlVerificationRuleEntity.Operator.IS_NOT_NULL;
    }

    private boolean requiresSecondaryValue(LogicalControlVerificationRuleEntity.Operator operator) {
        return operator == LogicalControlVerificationRuleEntity.Operator.BETWEEN;
    }

    private String conditionLabel(BuilderConditionDraft condition) {
        return condition.conditionType() == LogicalControlConditionEntity.ConditionType.INITIAL
            ? "Dastlabki shart"
            : condition.sortOrder() + "-qo'shimcha shart";
    }

    private String verificationRuleLabel(BuilderVerificationRuleDraft rule) {
        return "Tekshirish sharti " + rule.sortOrder();
    }

    private String warningMessageLabel(String localeCode) {
        return switch (localeCode) {
            case "UZ" -> "O'zbekcha (kiril)";
            case "OZ" -> "O'zbekcha (lotin)";
            case "RU" -> "Русский";
            case "EN" -> "English";
            default -> localeCode;
        };
    }

    private List<ApproverDepartmentDraft> currentApproverDepartments(LogicalControlEntity control) {
        if (control.getApproverDepartments() != null && !control.getApproverDepartments().isEmpty()) {
            return control.getApproverDepartments().stream()
                .sorted(java.util.Comparator.comparing(
                    approverDepartment -> Optional.ofNullable(approverDepartment.getSortOrder()).orElse(Integer.MAX_VALUE)
                ))
                .map(approverDepartment -> new ApproverDepartmentDraft(
                    approverDepartment.getDepartmentId(),
                    defaultIfBlank(approverDepartment.getDepartmentName(), ""),
                    Optional.ofNullable(approverDepartment.getSortOrder()).orElse(0)
                ))
                .filter(approverDepartment -> trimToNull(approverDepartment.departmentName()) != null)
                .toList();
        }

        return resolveApproverDepartments(List.of(), control.getApprovers());
    }

    private List<ApproverDepartmentDraft> resolveApproverDepartments(
        List<String> approverDepartmentIds,
        List<String> legacyApprovers
    ) {
        var normalizedDepartmentIds = listOrEmpty(approverDepartmentIds).stream()
            .map(this::trimToNull)
            .filter(java.util.Objects::nonNull)
            .distinct()
            .toList();
        if (!normalizedDepartmentIds.isEmpty()) {
            var departmentsById = classifierDepartmentRepository.findAllById(
                normalizedDepartmentIds.stream().map(UUID::fromString).toList()
            ).stream().collect(java.util.stream.Collectors.toMap(ClassifierDepartmentEntity::getId, department -> department));
            var approverDepartments = new ArrayList<ApproverDepartmentDraft>();
            for (var index = 0; index < normalizedDepartmentIds.size(); index++) {
                var rawDepartmentId = normalizedDepartmentIds.get(index);
                var departmentId = UUID.fromString(rawDepartmentId);
                var department = departmentsById.get(departmentId);
                if (department == null) {
                    throw new IllegalArgumentException("Kelishiladigan boshqarma topilmadi: " + rawDepartmentId);
                }
                approverDepartments.add(new ApproverDepartmentDraft(department.getId(), department.getName(), index + 1));
            }
            return approverDepartments;
        }

        var departmentsByName = classifierDepartmentRepository.findAllByOrderByNameAsc().stream()
            .collect(java.util.stream.Collectors.toMap(
                department -> department.getName().trim().toLowerCase(Locale.ROOT),
                department -> department,
                (left, right) -> left,
                java.util.LinkedHashMap::new
            ));
        var approverDepartments = new ArrayList<ApproverDepartmentDraft>();
        var normalizedLegacyApprovers = listOrEmpty(legacyApprovers).stream()
            .map(this::trimToNull)
            .filter(java.util.Objects::nonNull)
            .distinct()
            .toList();
        for (var index = 0; index < normalizedLegacyApprovers.size(); index++) {
            var legacyApproverName = normalizedLegacyApprovers.get(index);
            var department = departmentsByName.get(legacyApproverName.toLowerCase(Locale.ROOT));
            approverDepartments.add(new ApproverDepartmentDraft(
                department == null ? null : department.getId(),
                department == null ? legacyApproverName : department.getName(),
                index + 1
            ));
        }
        return approverDepartments;
    }

    private String approverDepartmentKey(LogicalControlApproverDepartmentEntity approverDepartment) {
        var departmentId = approverDepartment.getDepartmentId();
        if (departmentId != null) {
            return "ID:" + departmentId;
        }

        return "NAME:" + defaultIfBlank(approverDepartment.getDepartmentName(), "").toLowerCase(Locale.ROOT);
    }

    private String approverDepartmentKey(ApproverDepartmentDraft approverDepartment) {
        var departmentId = approverDepartment.departmentId();
        if (departmentId != null) {
            return "ID:" + departmentId;
        }

        return "NAME:" + defaultIfBlank(approverDepartment.departmentName(), "").toLowerCase(Locale.ROOT);
    }

    private List<?> asList(Object value) {
        return value instanceof List<?> list ? list : List.of();
    }

    private Map<String, Object> asMap(Object value) {
        return value instanceof Map<?, ?> rawMap
            ? rawMap.entrySet().stream()
                .filter(entry -> entry.getKey() != null)
                .collect(LinkedHashMap::new, (map, entry) -> map.put(String.valueOf(entry.getKey()), entry.getValue()), LinkedHashMap::putAll)
            : Map.of();
    }

    private Map<String, String> withRequiredMessageKeys(Map<String, String> messages) {
        var normalized = new LinkedHashMap<String, String>();
        for (var key : REQUIRED_MESSAGE_KEYS) {
            normalized.put(key, "");
        }
        if (messages != null) {
            messages.forEach((key, value) -> {
                var normalizedKey = normalizeMessageLocaleKey(key);
                if (normalizedKey != null) {
                    normalized.put(normalizedKey, value == null ? "" : value);
                }
            });
        }
        return normalized;
    }

    private String normalizeMessageLocaleKey(String key) {
        if (key == null || key.isBlank()) {
            return null;
        }

        return switch (key.trim().toLowerCase(Locale.ROOT)) {
            case "uz", "uzcyrl", "uz-cyrl" -> "UZ";
            case "oz", "uzlatn", "uz-latn" -> "OZ";
            case "ru" -> "RU";
            case "en" -> "EN";
            default -> REQUIRED_MESSAGE_KEYS.contains(key) ? key : null;
        };
    }

    private String normalizeStateCode(String stateCode) {
        var normalizedStateCode = trimToNull(stateCode);
        if (normalizedStateCode == null) {
            return DEFAULT_STATE_CODE;
        }

        return normalizedStateCode
            .toUpperCase(Locale.ROOT)
            .replace('-', '_')
            .replace(' ', '_');
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

    private ControlDtos.FieldChangeItem toFieldChangeItem(
        LogicalControlChangeHistoryEntity log,
        Map<String, String> actorDisplayNames
    ) {
        return new ControlDtos.FieldChangeItem(
            log.getId(),
            actorDisplayNames.getOrDefault(defaultIfBlank(log.getActor(), "system"), resolveActorDisplayName(log.getActor())),
            log.getChangedAt(),
            log.getFieldPath(),
            log.getOldValue(),
            log.getNewValue()
        );
    }

    private Map<String, String> resolveActorDisplayNames(List<LogicalControlChangeHistoryEntity> logs) {
        var displayNames = new LinkedHashMap<String, String>();
        var actorIds = logs.stream()
            .map(LogicalControlChangeHistoryEntity::getActor)
            .map(this::trimToNull)
            .filter(Objects::nonNull)
            .filter(actor -> !"system".equalsIgnoreCase(actor))
            .map(actor -> {
                try {
                    return UUID.fromString(actor);
                } catch (IllegalArgumentException exception) {
                    return null;
                }
            })
            .filter(Objects::nonNull)
            .distinct()
            .toList();

        if (!actorIds.isEmpty()) {
            userRepository.findAllById(actorIds).forEach(user ->
                displayNames.put(user.getId().toString(), defaultIfBlank(user.getFullName(), user.getId().toString()))
            );
        }

        logs.stream()
            .map(LogicalControlChangeHistoryEntity::getActor)
            .map(this::trimToNull)
            .filter(Objects::nonNull)
            .filter(actor -> !displayNames.containsKey(actor))
            .forEach(actor -> displayNames.put(actor, resolveActorDisplayName(actor)));

        return displayNames;
    }

    private String resolveActorDisplayName(String actor) {
        var normalizedActor = trimToNull(actor);
        if (normalizedActor == null) {
            return "system";
        }
        if ("system".equalsIgnoreCase(normalizedActor)) {
            return "system";
        }

        try {
            var actorId = UUID.fromString(normalizedActor);
            return userRepository.findById(actorId)
                .map(user -> defaultIfBlank(user.getFullName(), normalizedActor))
                .orElse(normalizedActor);
        } catch (IllegalArgumentException exception) {
            return normalizedActor;
        }
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
        return securityActorResolver.resolveActorId(authentication, "system");
    }

    private String defaultAuthorName(String actorName) {
        return defaultIfBlank(actorName, "system");
    }

    private String normalizeAuthorNameForPersistence(String authorName, String actorName) {
        var normalizedAuthorName = trimToNull(authorName);
        if (isActorIdentifier(normalizedAuthorName)) {
            return normalizedAuthorName;
        }

        return defaultAuthorName(actorName);
    }

    private String resolveAuthorName(LogicalControlEntity control) {
        var normalizedAuthorName = trimToNull(control.getAuthorName());
        if (isActorIdentifier(normalizedAuthorName)) {
            return normalizedAuthorName;
        }

        var createdByActorId = trimToNull(control.getInsUser());
        if (isActorIdentifier(createdByActorId)) {
            return createdByActorId;
        }

        return defaultAuthorName(normalizedAuthorName);
    }

    private boolean isActorIdentifier(String value) {
        var normalized = trimToNull(value);
        if (normalized == null) {
            return false;
        }

        if ("system".equalsIgnoreCase(normalized)) {
            return true;
        }

        try {
            UUID.fromString(normalized);
            return true;
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private String normalizeConfidentialityLevel(String confidentialityLevel) {
        var normalized = trimToNull(confidentialityLevel);
        if (normalized == null) {
            return DEFAULT_CONFIDENTIALITY_LEVEL;
        }

        var normalizedKey = normalized
            .toUpperCase(Locale.ROOT)
            .replace('-', '_')
            .replace(' ', '_');

        return switch (normalizedKey) {
            case "MAXFIY", CONFIDENTIALITY_LEVEL_CONFIDENTIAL -> CONFIDENTIALITY_LEVEL_CONFIDENTIAL;
            case "MAXFIY_EMAS", "NOT_CONFIDENTIAL", "NONCONFIDENTIAL", "INTERNAL", CONFIDENTIALITY_LEVEL_NON_CONFIDENTIAL ->
                CONFIDENTIALITY_LEVEL_NON_CONFIDENTIAL;
            default -> normalizedKey;
        };
    }

    private String defaultIfBlank(String value, String fallback) {
        var normalized = trimToNull(value);
        return normalized == null ? fallback : normalized;
    }

    private String peekNextUniqueNumber() {
        var currentYear = currentYear();
        var currentValue = jdbcTemplate.query(
            "select last_value from logical_control_number_sequences where sequence_year = ?",
            resultSet -> resultSet.next() ? resultSet.getInt("last_value") : null,
            currentYear
        );

        return formatUniqueNumber(currentYear, currentValue == null ? 1 : currentValue + 1);
    }

    private String allocateNextUniqueNumber() {
        var currentYear = currentYear();
        Integer nextValue;
        var updated = jdbcTemplate.update(
            "update logical_control_number_sequences set last_value = last_value + 1 where sequence_year = ?",
            currentYear
        );

        if (updated == 0) {
            try {
                jdbcTemplate.update(
                    "insert into logical_control_number_sequences(sequence_year, last_value) values (?, 1)",
                    currentYear
                );
                nextValue = 1;
            } catch (DuplicateKeyException exception) {
                jdbcTemplate.update(
                    "update logical_control_number_sequences set last_value = last_value + 1 where sequence_year = ?",
                    currentYear
                );
                nextValue = jdbcTemplate.queryForObject(
                    "select last_value from logical_control_number_sequences where sequence_year = ?",
                    Integer.class,
                    currentYear
                );
            }
        } else {
            nextValue = jdbcTemplate.queryForObject(
                "select last_value from logical_control_number_sequences where sequence_year = ?",
                Integer.class,
                currentYear
            );
        }

        return formatUniqueNumber(currentYear, nextValue == null ? 1 : nextValue);
    }

    private int currentYear() {
        return LocalDate.now(CONTROL_NUMBER_ZONE).getYear();
    }

    private String formatUniqueNumber(int year, int serial) {
        return "LC" + year + String.format("%07d", serial);
    }

    private String trimToEmpty(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        var normalized = value.trim();
        return normalized.isBlank() ? null : normalized;
    }

    private record BuilderConditionDraft(
        String parameterName,
        Integer sortOrder,
        LogicalControlConditionEntity.ConditionType conditionType,
        String serverName,
        String sqlQuery
    ) {
    }

    private record BuilderVerificationRuleDraft(
        Integer sortOrder,
        LogicalControlVerificationRuleEntity.Joiner joiner,
        LogicalControlVerificationRuleEntity.FieldSource fieldSource,
        String tableName,
        String fieldRef,
        LogicalControlVerificationRuleEntity.Operator operator,
        String comparisonValue,
        String secondaryComparisonValue
    ) {
    }

    private record ApproverDepartmentDraft(
        UUID departmentId,
        String departmentName,
        Integer sortOrder
    ) {
    }

    private record StateDescriptor(
        String code,
        String name,
        String langCode
    ) {
    }
}

