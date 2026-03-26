package uz.logicalcontrol.backend.bootstrap;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import uz.logicalcontrol.backend.dictionary.DictionaryEntryEntity;
import uz.logicalcontrol.backend.dictionary.DictionaryEntryRepository;
import uz.logicalcontrol.backend.exception.ExceptionEntryEntity;
import uz.logicalcontrol.backend.exception.ExceptionEntryRepository;
import uz.logicalcontrol.backend.logging.ChangeLogEntity;
import uz.logicalcontrol.backend.logging.ChangeLogRepository;
import uz.logicalcontrol.backend.logging.ExecutionLogEntity;
import uz.logicalcontrol.backend.logging.ExecutionLogRepository;
import uz.logicalcontrol.backend.mn.LogicalControlEntity;
import uz.logicalcontrol.backend.mn.LogicalControlRepository;
import uz.logicalcontrol.backend.mn.LogicalRuleEntity;
import uz.logicalcontrol.backend.user.RoleEntity;
import uz.logicalcontrol.backend.user.RoleRepository;
import uz.logicalcontrol.backend.user.UserEntity;
import uz.logicalcontrol.backend.user.UserRepository;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final LogicalControlRepository logicalControlRepository;
    private final ExecutionLogRepository executionLogRepository;
    private final ChangeLogRepository changeLogRepository;
    private final DictionaryEntryRepository dictionaryEntryRepository;
    private final ExceptionEntryRepository exceptionEntryRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        seedRolesAndAdmin();
        seedDictionaries();
        seedExceptions();
        seedControls();
    }

    private void seedRolesAndAdmin() {
        var adminRole = roleRepository.findByCode("ADMIN")
            .orElseGet(() -> roleRepository.save(RoleEntity.builder().code("ADMIN").name("Administrator").build()));
        var analystRole = roleRepository.findByCode("ANALYST")
            .orElseGet(() -> roleRepository.save(RoleEntity.builder().code("ANALYST").name("Business Analyst").build()));
        var auditorRole = roleRepository.findByCode("AUDITOR")
            .orElseGet(() -> roleRepository.save(RoleEntity.builder().code("AUDITOR").name("Auditor").build()));

        userRepository.findByUsernameIgnoreCase("admin").orElseGet(() -> userRepository.save(
            UserEntity.builder()
                .username("admin")
                .fullName("Logical Control Administrator")
                .passwordHash(passwordEncoder.encode("Admin123!"))
                .locale("uz-Latn")
                .roles(new java.util.LinkedHashSet<>(List.of(adminRole, analystRole, auditorRole)))
                .enabled(true)
                .build()
        ));
    }

    private void seedDictionaries() {
        if (dictionaryEntryRepository.count() > 0) {
            return;
        }

        var entries = List.of(
            dictionary("SYSTEM_NAME", "AT", "AT", "AT", "AT", "AT"),
            dictionary("SYSTEM_NAME", "EK", "EK", "EK", "EK", "EK"),
            dictionary("SYSTEM_NAME", "RW", "RW", "RW", "RW", "RW"),
            dictionary("SYSTEM_NAME", "EC", "EC", "EC", "EC", "EC"),
            dictionary("CONTROL_TYPE", "WARNING", "Ogohlantirish", "Огоҳлантириш", "Предупреждение", "Warning"),
            dictionary("CONTROL_TYPE", "ALLOW", "Ruxsat berish", "Рухсат бериш", "Разрешение", "Allow"),
            dictionary("CONTROL_TYPE", "BLOCK", "Taqiqlash", "Тақиқлаш", "Запрет", "Block"),
            dictionary("PROCESS_STAGE", "VERIFICATION", "Verifikatsiya", "Верификация", "Верификация", "Verification"),
            dictionary("PROCESS_STAGE", "FORMALIZATION", "Rasmiylashtirish", "Расмийлаштириш", "Оформление", "Formalization"),
            dictionary("PROCESS_STAGE", "ACCEPTANCE", "Qabul qilish", "Қабул қилиш", "Приемка", "Acceptance"),
            dictionary("DEPARTMENT", "RISK", "Risk boshqarmasi", "Риск бошқармаси", "Управление риска", "Risk Department"),
            dictionary("DEPARTMENT", "CUSTOMS", "Bojxona nazorati", "Божхона назорати", "Таможенный контроль", "Customs Control")
        );

        dictionaryEntryRepository.saveAll(entries);
    }

    private void seedExceptions() {
        if (exceptionEntryRepository.count() > 0) {
            return;
        }

        exceptionEntryRepository.saveAll(List.of(
            ExceptionEntryEntity.builder()
                .exceptionType("FIRM")
                .subjectKey("308901223")
                .description("Strategik importyor uchun istisno")
                .validFrom(LocalDate.now().minusDays(30))
                .validTo(LocalDate.now().plusDays(90))
                .active(true)
                .build(),
            ExceptionEntryEntity.builder()
                .exceptionType("CARRIER")
                .subjectKey("01A777AA")
                .description("VIP tashuvchi uchun monitoring istisnosi")
                .validFrom(LocalDate.now().minusDays(5))
                .validTo(LocalDate.now().plusDays(45))
                .active(true)
                .build()
        ));
    }

    private void seedControls() {
        if (logicalControlRepository.count() > 0) {
            return;
        }

        var controls = List.of(
            control("MN-AT-001", "Ruxsatnoma va mashina raqami mosligi", LogicalControlEntity.SystemName.AT, LogicalControlEntity.ControlType.BLOCK),
            control("MN-EK-002", "Risk toifasi bo'yicha ogohlantirish", LogicalControlEntity.SystemName.EK, LogicalControlEntity.ControlType.WARNING),
            control("MN-RW-003", "Muddatdan o'tgan ruxsatnoma", LogicalControlEntity.SystemName.RW, LogicalControlEntity.ControlType.BLOCK),
            control("MN-EC-004", "Maxfiy yuk bo'yicha qo'shimcha nazorat", LogicalControlEntity.SystemName.EC, LogicalControlEntity.ControlType.ALLOW)
        );

        logicalControlRepository.saveAll(controls);
        controls.forEach(control -> {
            executionLogRepository.saveAll(sampleLogs(control));
            changeLogRepository.saveAll(sampleChangeLogs(control));
        });
    }

    private DictionaryEntryEntity dictionary(String category, String code, String uzLatn, String uzCyrl, String ru, String en) {
        return DictionaryEntryEntity.builder()
            .category(category)
            .code(code)
            .labels(Map.of(
                "uzLatn", uzLatn,
                "uzCyrl", uzCyrl,
                "ru", ru,
                "en", en
            ))
            .active(true)
            .build();
    }

    private LogicalControlEntity control(
        String code,
        String name,
        LogicalControlEntity.SystemName systemName,
        LogicalControlEntity.ControlType controlType
    ) {
        var control = LogicalControlEntity.builder()
            .code(code)
            .name(name)
            .objective("Deklaratsiya va biriktirilgan hujjatlar o'rtasidagi uyg'unlikni nazorat qilish")
            .systemName(systemName)
            .approvers(new ArrayList<>(List.of("Azizbek Tursunov", "Dilshod Qodirov")))
            .startDate(LocalDate.now().minusDays(40))
            .finishDate(LocalDate.now().plusMonths(6))
            .uniqueNumber(code.replace("MN", "UNQ"))
            .controlType(controlType)
            .processStage("VERIFICATION")
            .authorName("Admin User")
            .responsibleDepartment("Risk boshqarmasi")
            .status(LogicalControlEntity.ControlStatus.ACTIVE)
            .suspendedUntil(LocalDateTime.now().plusDays(3))
            .messages(Map.of(
                "uzLatn", "Shart bajarilmadi, deklaratsiyani qayta tekshiring",
                "uzCyrl", "Шарт бажарилмади, декларацияни қайта текширинг",
                "ru", "Условие не выполнено, проверьте декларацию повторно",
                "en", "Condition failed, review declaration again"
            ))
            .phoneExtension("1155")
            .priorityOrder(1)
            .confidentialityLevel("INTERNAL")
            .smsNotificationEnabled(true)
            .smsPhones(new ArrayList<>(List.of("+998901112233", "+998977778899")))
            .deploymentScope(LogicalControlEntity.DeploymentScope.HYBRID)
            .versionNumber(3)
            .timeoutMs(3500)
            .lastExecutionDurationMs(742L)
            .territories(new ArrayList<>(List.of("Toshkent", "Samarqand")))
            .posts(new ArrayList<>(List.of("Yallama", "Aeroport")))
            .autoCancelAfterDays(90)
            .conflictMonitoringEnabled(true)
            .ruleBuilderCanvas(builderCanvas(name))
            .build();

        control.getRules().add(LogicalRuleEntity.builder()
            .control(control)
            .name("Ruxsatnoma muddati tekshiruvi")
            .description("Ruxsatnoma bugungi sanadan o'tmagan bo'lishi kerak")
            .sortOrder(1)
            .active(true)
            .ruleType(LogicalRuleEntity.RuleType.CONDITION)
            .definition(Map.of("field", "permit.expireDate", "operator", ">=", "value", "today"))
            .visual(Map.of("x", 100, "y", 140))
            .build());
        control.getRules().add(LogicalRuleEntity.builder()
            .control(control)
            .name("Natija")
            .description("Shartlar to'g'ri bo'lsa yakuniy qaror")
            .sortOrder(2)
            .active(true)
            .ruleType(LogicalRuleEntity.RuleType.RESULT)
            .definition(Map.of("action", controlType.name()))
            .visual(Map.of("x", 360, "y", 140))
            .build());

        return control;
    }

    private Map<String, Object> builderCanvas(String title) {
        var canvas = new LinkedHashMap<String, Object>();
        canvas.put("title", title);
        canvas.put("nodes", List.of(
            Map.<String, Object>of(
                "id", "start",
                "type", "condition",
                "label", "Deklaratsiya tekshiruvi",
                "position", Map.of("x", 100, "y", 140)
            ),
            Map.<String, Object>of(
                "id", "result",
                "type", "result",
                "label", "Qaror",
                "position", Map.of("x", 360, "y", 140)
            )
        ));
        canvas.put("edges", List.of(
            Map.of(
                "id", "edge-1",
                "source", "start",
                "target", "result",
                "label", "ha"
            )
        ));
        return canvas;
    }

    private List<ExecutionLogEntity> sampleLogs(LogicalControlEntity control) {
        return List.of(
            ExecutionLogEntity.builder()
                .control(control)
                .instime(Instant.now().minusSeconds(3600))
                .result(ExecutionLogEntity.ExecutionResult.POSITIVE)
                .declarationId("DECL-22001")
                .declarationUncodId("UNC-99001")
                .durationMs(610L)
                .matchedRuleName("Ruxsatnoma muddati tekshiruvi")
                .details(Map.of("vehicleNo", "01A777AA"))
                .build(),
            ExecutionLogEntity.builder()
                .control(control)
                .instime(Instant.now().minusSeconds(9600))
                .result(ExecutionLogEntity.ExecutionResult.NEGATIVE)
                .declarationId("DECL-22002")
                .declarationUncodId("UNC-99002")
                .durationMs(940L)
                .matchedRuleName("Natija")
                .details(Map.of("conflict", true, "reason", "Muddat tugagan"))
                .build()
        );
    }

    private List<ChangeLogEntity> sampleChangeLogs(LogicalControlEntity control) {
        return List.of(
            ChangeLogEntity.builder()
                .control(control)
                .actor("admin")
                .action("CREATED")
                .changedAt(Instant.now().minusSeconds(86400))
                .details(Map.of("status", control.getStatus().name()))
                .build(),
            ChangeLogEntity.builder()
                .control(control)
                .actor("admin")
                .action("UPDATED")
                .changedAt(Instant.now().minusSeconds(32000))
                .details(Map.of("field", "timeoutMs", "newValue", control.getTimeoutMs()))
                .build()
        );
    }
}
