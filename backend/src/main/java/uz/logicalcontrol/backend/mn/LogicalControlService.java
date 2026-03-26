package uz.logicalcontrol.backend.mn;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import uz.logicalcontrol.backend.logging.ChangeLogEntity;
import uz.logicalcontrol.backend.logging.ChangeLogRepository;
import uz.logicalcontrol.backend.logging.ExecutionLogEntity;
import uz.logicalcontrol.backend.logging.ExecutionLogRepository;

@Service
@RequiredArgsConstructor
public class LogicalControlService {

    private static final List<String> REQUIRED_MESSAGE_KEYS = List.of("uzCyrl", "uzLatn", "ru", "en");

    private final LogicalControlRepository logicalControlRepository;
    private final ExecutionLogRepository executionLogRepository;
    private final ChangeLogRepository changeLogRepository;

    @Transactional(readOnly = true)
    public List<ControlDtos.ControlListItem> list(String query, String status, String systemName) {
        return logicalControlRepository.findAllByOrderByUpdatedAtDesc().stream()
            .filter(control -> matchesQuery(control, query))
            .filter(control -> matchesEnum(control.getStatus().name(), status))
            .filter(control -> matchesEnum(control.getSystemName().name(), systemName))
            .map(control -> new ControlDtos.ControlListItem(
                control.getId(),
                control.getCode(),
                control.getName(),
                control.getSystemName(),
                control.getControlType(),
                control.getStatus(),
                control.getProcessStage(),
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

    @Transactional
    public ControlDtos.ControlDetail create(ControlDtos.ControlRequest request, Authentication authentication) {
        validateUniqueFields(request.code(), request.uniqueNumber(), null);
        validateMessages(request.messages());

        var control = new LogicalControlEntity();
        applyRequest(control, request);
        var saved = logicalControlRepository.save(control);
        appendChangeLog(saved, authentication.getName(), "CREATED", Map.of(
            "code", saved.getCode(),
            "version", saved.getVersionNumber()
        ));

        return get(saved.getId());
    }

    @Transactional
    public ControlDtos.ControlDetail update(UUID id, ControlDtos.ControlRequest request, Authentication authentication) {
        var control = findControl(id);
        validateUniqueFields(request.code(), request.uniqueNumber(), id);
        validateMessages(request.messages());

        applyRequest(control, request);
        logicalControlRepository.save(control);
        appendChangeLog(control, authentication.getName(), "UPDATED", Map.of(
            "code", control.getCode(),
            "version", control.getVersionNumber()
        ));

        return get(control.getId());
    }

    @Transactional
    public ControlDtos.ControlDetail duplicate(UUID id, Authentication authentication) {
        var source = findControl(id);
        var duplicate = LogicalControlEntity.builder()
            .code(source.getCode() + "-COPY")
            .name(source.getName() + " copy")
            .objective(source.getObjective())
            .systemName(source.getSystemName())
            .approvers(new ArrayList<>(source.getApprovers()))
            .startDate(source.getStartDate())
            .finishDate(source.getFinishDate())
            .uniqueNumber(source.getUniqueNumber() + "-COPY")
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
            .versionNumber(Optional.ofNullable(source.getVersionNumber()).orElse(1) + 1)
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

        var saved = logicalControlRepository.save(duplicate);
        appendChangeLog(saved, authentication.getName(), "DUPLICATED", Map.of(
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
        return control.getCode().toLowerCase(Locale.ROOT).contains(term)
            || control.getName().toLowerCase(Locale.ROOT).contains(term)
            || control.getUniqueNumber().toLowerCase(Locale.ROOT).contains(term)
            || control.getResponsibleDepartment().toLowerCase(Locale.ROOT).contains(term);
    }

    private boolean matchesEnum(String source, String value) {
        return value == null || value.isBlank() || source.equalsIgnoreCase(value.trim());
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

    private void validateMessages(Map<String, String> messages) {
        if (messages == null) {
            throw new IllegalArgumentException("4 tildagi xabarlar majburiy");
        }

        var missing = REQUIRED_MESSAGE_KEYS.stream()
            .filter(key -> !messages.containsKey(key) || messages.get(key) == null || messages.get(key).isBlank())
            .toList();
        if (!missing.isEmpty()) {
            throw new IllegalArgumentException("Xabarlar to'liq emas: " + String.join(", ", missing));
        }
    }

    private LogicalControlEntity findControl(UUID id) {
        return logicalControlRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("MN topilmadi: " + id));
    }

    private void applyRequest(LogicalControlEntity control, ControlDtos.ControlRequest request) {
        control.setCode(request.code().trim());
        control.setName(request.name().trim());
        control.setObjective(request.objective());
        control.setSystemName(request.systemName());
        control.setApprovers(listOrEmpty(request.approvers()));
        control.setStartDate(request.startDate());
        control.setFinishDate(request.finishDate());
        control.setUniqueNumber(request.uniqueNumber().trim());
        control.setControlType(request.controlType());
        control.setProcessStage(request.processStage().trim());
        control.setAuthorName(request.authorName().trim());
        control.setResponsibleDepartment(request.responsibleDepartment().trim());
        control.setStatus(request.status());
        control.setSuspendedUntil(request.suspendedUntil());
        control.setMessages(new LinkedHashMap<>(request.messages()));
        control.setPhoneExtension(request.phoneExtension());
        control.setPriorityOrder(request.priorityOrder());
        control.setConfidentialityLevel(request.confidentialityLevel());
        control.setSmsNotificationEnabled(Boolean.TRUE.equals(request.smsNotificationEnabled()));
        control.setSmsPhones(listOrEmpty(request.smsPhones()));
        control.setDeploymentScope(request.deploymentScope());
        control.setVersionNumber(Optional.ofNullable(request.versionNumber()).orElse(1));
        control.setTimeoutMs(request.timeoutMs());
        control.setLastExecutionDurationMs(request.lastExecutionDurationMs());
        control.setTerritories(listOrEmpty(request.territories()));
        control.setPosts(listOrEmpty(request.posts()));
        control.setAutoCancelAfterDays(request.autoCancelAfterDays());
        control.setConflictMonitoringEnabled(!Boolean.FALSE.equals(request.conflictMonitoringEnabled()));
        control.setCopiedFromControlId(request.copiedFromControlId());
        control.setRuleBuilderCanvas(mapOrEmpty(request.ruleBuilderCanvas()));

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
}
