package uz.logicalcontrol.backend.config;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import uz.logicalcontrol.backend.entity.ChangeLogEntity;
import uz.logicalcontrol.backend.entity.ClassifierDepartmentEntity;
import uz.logicalcontrol.backend.entity.ClassifierProcessStageEntity;
import uz.logicalcontrol.backend.entity.ClassifierRoleEntity;
import uz.logicalcontrol.backend.entity.ClassifierServerEntity;
import uz.logicalcontrol.backend.entity.ClassifierStateEntity;
import uz.logicalcontrol.backend.entity.ClassifierSystemTypeEntity;
import uz.logicalcontrol.backend.entity.DictionaryEntryEntity;
import uz.logicalcontrol.backend.entity.ExceptionEntryEntity;
import uz.logicalcontrol.backend.entity.ExecutionLogEntity;
import uz.logicalcontrol.backend.entity.LogicalControlEntity;
import uz.logicalcontrol.backend.entity.LogicalRuleEntity;
import uz.logicalcontrol.backend.entity.LogicalControlStateHistoryEntity;
import uz.logicalcontrol.backend.entity.RoleEntity;
import uz.logicalcontrol.backend.entity.UserEntity;
import uz.logicalcontrol.backend.repository.ChangeLogRepository;
import uz.logicalcontrol.backend.repository.ClassifierDepartmentRepository;
import uz.logicalcontrol.backend.repository.ClassifierProcessStageRepository;
import uz.logicalcontrol.backend.repository.ClassifierRoleRepository;
import uz.logicalcontrol.backend.repository.ClassifierServerRepository;
import uz.logicalcontrol.backend.repository.ClassifierStateRepository;
import uz.logicalcontrol.backend.repository.ClassifierSystemTypeRepository;
import uz.logicalcontrol.backend.repository.DictionaryEntryRepository;
import uz.logicalcontrol.backend.repository.ExceptionEntryRepository;
import uz.logicalcontrol.backend.repository.ExecutionLogRepository;
import uz.logicalcontrol.backend.repository.LogicalControlRepository;
import uz.logicalcontrol.backend.repository.RoleRepository;
import uz.logicalcontrol.backend.repository.UserRepository;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private static final String DEFAULT_STATE_CODE = "NEW";
    private static final String DEFAULT_STATE_LANG = "OZ";

    private record ProcessStageSeed(String name, String description, int sortOrder) {
    }

    private record ServerSeed(String name, String description) {
    }

    private record StateSeed(String code, String lang, String name) {
    }

    private static final List<ProcessStageSeed> REQUIRED_PROCESS_STAGES = List.of(
        new ProcessStageSeed("Ma'lumot kiritish", "Ma'lumotlarni dastlabki kiritish bosqichi.", 1),
        new ProcessStageSeed("Jo'natish", "Jo'natish jarayonidagi nazorat bosqichi.", 2),
        new ProcessStageSeed("Qabul qilish", "Qabul qilish jarayonidagi nazorat bosqichi.", 3),
        new ProcessStageSeed("Biriktirish", "Hujjat yoki obyektlarni biriktirish bosqichi.", 4),
        new ProcessStageSeed("Verifikatsiyadan o'tkazish", "Verifikatsiya va solishtirish bosqichi.", 5),
        new ProcessStageSeed("Transport nazorati", "Transport vositasi bo'yicha nazorat bosqichi.", 6),
        new ProcessStageSeed("IKM nazorati", "IKM nazorati bosqichi.", 7),
        new ProcessStageSeed("Bojxona ko'zdan kechiruvi", "Bojxona ko'zdan kechiruvi bosqichi.", 8),
        new ProcessStageSeed("Kinolog tekshiruvi", "Kinolog tekshiruvi bosqichi.", 9),
        new ProcessStageSeed("Veterinariya nazorati", "Veterinariya nazorati bosqichi.", 10),
        new ProcessStageSeed("Fitosanitariya nazorati", "Fitosanitariya nazorati bosqichi.", 11),
        new ProcessStageSeed("Nazoratga qo'yish", "Nazoratga qo'yish bosqichi.", 12),
        new ProcessStageSeed("Postga yetib keldi", "Postga yetib kelganini qayd etish bosqichi.", 13),
        new ProcessStageSeed("Nazoratdan yechish", "Nazoratdan yechish bosqichi.", 14),
        new ProcessStageSeed("Omborga yetib keldi", "Omborga yetib kelganini qayd etish bosqichi.", 15),
        new ProcessStageSeed("Omborda nazoratdan yechilgan", "Omborda nazoratdan yechilgan bosqichi.", 16),
        new ProcessStageSeed("Keyingi manzilga yuborilgan", "Keyingi manzilga yuborish bosqichi.", 17)
    );

    private static final List<ServerSeed> REQUIRED_SERVERS = List.of(
        new ServerSeed("etran.db.gtk", "ETRAN asosiy serveri"),
        new ServerSeed("dbtest.db.gtk", "Test muhiti serveri"),
        new ServerSeed("mat.db.gtk", "MAT serveri"),
        new ServerSeed("ed1.db.gtk", "ED1 serveri"),
        new ServerSeed("arxiv.db.gtk", "Arxiv serveri"),
        new ServerSeed("ebr02.db.gtk", "EBR02 serveri"),
        new ServerSeed("ebr01.db.gtk", "EBR01 serveri"),
        new ServerSeed("Dc1paym01.db.gtk", "To'lovlar serveri")
    );

    private static final List<StateSeed> REQUIRED_STATES = List.of(
        new StateSeed("NEW", "OZ", "Yangi"),
        new StateSeed("NEW", "UZ", "\u042f\u043d\u0433\u0438"),
        new StateSeed("NEW", "RU", "\u041d\u043e\u0432\u044b\u0439"),
        new StateSeed("NEW", "EN", "New"),
        new StateSeed("SAVED", "OZ", "Ma'lumotlar saqlangan"),
        new StateSeed("SAVED", "UZ", "\u041c\u0430\u044a\u043b\u0443\u043c\u043e\u0442\u043b\u0430\u0440 \u0441\u0430\u049b\u043b\u0430\u043d\u0433\u0430\u043d"),
        new StateSeed("SAVED", "RU", "\u0414\u0430\u043d\u043d\u044b\u0435 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u044b"),
        new StateSeed("SAVED", "EN", "Data saved"),
        new StateSeed("APPROVED_BY_DEPARTMENT", "OZ", "XXX Boshqarmasi tomonidan tasdiqlangan"),
        new StateSeed("APPROVED_BY_DEPARTMENT", "UZ", "XXX \u0411\u043e\u0448\u049b\u0430\u0440\u043c\u0430\u0441\u0438 \u0442\u043e\u043c\u043e\u043d\u0438\u0434\u0430\u043d \u0442\u0430\u0441\u0434\u0438\u049b\u043b\u0430\u043d\u0433\u0430\u043d"),
        new StateSeed("APPROVED_BY_DEPARTMENT", "RU", "\u0423\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u043e \u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435\u043c XXX"),
        new StateSeed("APPROVED_BY_DEPARTMENT", "EN", "Approved by XXX Department"),
        new StateSeed("APPROVED", "OZ", "Mantiqiy nazorat tasdiqlangan"),
        new StateSeed("APPROVED", "UZ", "\u041c\u0430\u043d\u0442\u0438\u049b\u0438\u0439 \u043d\u0430\u0437\u043e\u0440\u0430\u0442 \u0442\u0430\u0441\u0434\u0438\u049b\u043b\u0430\u043d\u0433\u0430\u043d"),
        new StateSeed("APPROVED", "RU", "\u041b\u043e\u0433\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044c \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d"),
        new StateSeed("APPROVED", "EN", "Logical control approved")
    );

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final LogicalControlRepository logicalControlRepository;
    private final ExecutionLogRepository executionLogRepository;
    private final ChangeLogRepository changeLogRepository;
    private final DictionaryEntryRepository dictionaryEntryRepository;
    private final ExceptionEntryRepository exceptionEntryRepository;
    private final ClassifierDepartmentRepository classifierDepartmentRepository;
    private final ClassifierProcessStageRepository classifierProcessStageRepository;
    private final ClassifierRoleRepository classifierRoleRepository;
    private final ClassifierServerRepository classifierServerRepository;
    private final ClassifierStateRepository classifierStateRepository;
    private final ClassifierSystemTypeRepository classifierSystemTypeRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        seedRolesAndAdmin();
        seedDictionaries();
        seedExceptions();
        seedClassifiers();
        backfillControlStates();
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
                .locale("OZ")
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
            dictionary("CONTROL_TYPE", "WARNING", "Ogohlantirish", "\u041e\u0493\u043e\u04b3\u043b\u0430\u043d\u0442\u0438\u0440\u0438\u0448", "\u041f\u0440\u0435\u0434\u0443\u043f\u0440\u0435\u0436\u0434\u0435\u043d\u0438\u0435", "Warning"),
            dictionary("CONTROL_TYPE", "ALLOW", "Ruxsat berish", "\u0420\u0443\u0445\u0441\u0430\u0442 \u0411\u0435\u0440\u0438\u0448", "\u0420\u0430\u0437\u0440\u0435\u0448\u0435\u043d\u0438\u0435", "Allow"),
            dictionary("CONTROL_TYPE", "BLOCK", "Taqiqlash", "\u0422\u0430\u049b\u0438\u049b\u043b\u0430\u0448", "\u0417\u0430\u043f\u0440\u0435\u0442", "Block"),
            dictionary("PROCESS_STAGE", "VERIFICATION", "Verifikatsiya", "\u0412\u0435\u0440\u0438\u0444\u0438\u043a\u0430\u0446\u0438\u044f", "\u0412\u0435\u0440\u0438\u0444\u0438\u043a\u0430\u0446\u0438\u044f", "Verification"),
            dictionary("PROCESS_STAGE", "FORMALIZATION", "Rasmiylashtirish", "\u0420\u0430\u0441\u043c\u0438\u0439\u043b\u0430\u0448\u0442\u0438\u0440\u0438\u0448", "\u041e\u0444\u043e\u0440\u043c\u043b\u0435\u043d\u0438\u0435", "Formalization"),
            dictionary("PROCESS_STAGE", "ACCEPTANCE", "Qabul qilish", "\u049a\u0430\u0431\u0443\u043b \u049b\u0438\u043b\u0438\u0448", "\u041f\u0440\u0438\u0435\u043c\u043a\u0430", "Acceptance"),
            dictionary("DEPARTMENT", "RISK", "Risk boshqarmasi", "\u0420\u0438\u0441\u043a \u0431\u043e\u0448\u049b\u0430\u0440\u043c\u0430\u0441\u0438", "\u0423\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435 \u0440\u0438\u0441\u043a\u0430", "Risk Department"),
            dictionary("DEPARTMENT", "CUSTOMS", "Bojxona nazorati", "\u0411\u043e\u0436\u0445\u043e\u043d\u0430 \u043d\u0430\u0437\u043e\u0440\u0430\u0442\u0438", "\u0422\u0430\u043c\u043e\u0436\u0435\u043d\u043d\u044b\u0439 \u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044c", "Customs Control")
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

    private void seedClassifiers() {
        if (classifierDepartmentRepository.count() == 0) {
            classifierDepartmentRepository.saveAll(List.of(
                department("Bojxona nazorati va rasmiylashtiruvini tashkil etish boshqarmasi", "Boshqarma"),
                department("Notarif tartibga solish boshqarmasi", "Boshqarma"),
                department("Targetlash va xavflarni monitoring qilish boshqarmasi", "Boshqarma"),
                department("Axborot-kommunikatsiya texnologiyalari va kiberxavfsizligini ta'minlash boshqarmasi", "Boshqarma"),
                department("Strategik rejalashtirish va bojxona tartib-taomillarini soddalashtirish boshqarmasi", "Boshqarma"),
                department("Bojxona to'lovlari boshqarmasi", "Boshqarma"),
                department("Tashqi savdo bojxona statistikasi boshqarmasi", "Boshqarma"),
                department("Valyuta nazorati boshqarmasi", "Boshqarma"),
                department("Moliya-iqtisodiyot boshqarmasi", "Boshqarma"),
                department("Moddiy-texnika ta'minoti boshqarmasi", "Boshqarma"),
                department("Kapital qurilish laboratoriyasi", "Laboratoriya"),
                department("Kontrabandaga qarshi kurashish boshqarmasi", "Boshqarma"),
                department("Bojxona audit boshqarmasi", "Boshqarma"),
                department("Harbiy safarbarlik, jangovar tayyorgarlik va qo'riqlash boshqarmasi", "Boshqarma"),
                department("Xalqaro hamkorlik boshqarmasi", "Boshqarma"),
                department("Surishtiruv va ma'muriy amaliyot boshqarmasi", "Boshqarma"),
                department("Rais maslahatchisi", "Lavozim"),
                department("Inson resurslarini rivojlantirish va boshqarish boshqarmasi", "Boshqarma"),
                department("Shaxsiy xavfsizlik boshqarmasi", "Boshqarma"),
                department("Tashkiliy-nazorat, xizmat faoliyatini tahlil qilish va baholash boshqarmasi", "Boshqarma"),
                department("Yuridik boshqarma", "Boshqarma"),
                department("Jamoatchilik va ommaviy axborot vositalari bilan aloqalar bo'limi", "Bo'lim"),
                department("Murojaatlar bilan ishlash bo'limi", "Bo'lim"),
                department("Tibbiy ijtimoiy muassasalar bilan ishlash bo'limi", "Bo'lim"),
                department("Ichki audit va moliyaviy nazorat bo'limi", "Bo'lim"),
                department("Birinchi bo'lim", "Bo'lim"),
                department("A sektori", "Sektor")
            ));
        }

        seedRequiredProcessStages();
        seedRequiredServers();
        seedRequiredStates();

        if (classifierSystemTypeRepository.count() == 0) {
            seedRequiredSystemTypes();
            return;
        }

        seedRequiredSystemTypes();
    }

    private void seedControls() {
        if (logicalControlRepository.count() > 0) {
            return;
        }

        var controls = List.of(
            control(
                "MN-AT-001",
                "Ruxsatnoma va mashina raqami mosligi",
                "Yukli avtotransport (AT)",
                LogicalControlEntity.DeploymentScope.INTERNAL,
                LogicalControlEntity.DirectionType.ENTRY,
                LogicalControlEntity.ControlType.BLOCK
            ),
            control(
                "MN-EK-002",
                "Risk toifasi bo'yicha ogohlantirish",
                "Eksport uch qadam (EK)",
                LogicalControlEntity.DeploymentScope.EXTERNAL,
                null,
                LogicalControlEntity.ControlType.WARNING
            ),
            control(
                "MN-RW-003",
                "Muddatdan o'tgan ruxsatnoma",
                "Temir yo'l (RW)",
                LogicalControlEntity.DeploymentScope.INTERNAL,
                LogicalControlEntity.DirectionType.EXIT,
                LogicalControlEntity.ControlType.BLOCK
            ),
            control(
                "MN-EC-004",
                "Maxfiy yuk bo'yicha qo'shimcha nazorat",
                "Elektron tijorat (EC)",
                LogicalControlEntity.DeploymentScope.EXTERNAL,
                null,
                LogicalControlEntity.ControlType.ALLOW
            )
        );

        logicalControlRepository.saveAll(controls);
        controls.forEach(control -> {
            executionLogRepository.saveAll(sampleLogs(control));
            changeLogRepository.saveAll(sampleChangeLogs(control));
        });
    }

    private DictionaryEntryEntity dictionary(String category, String code, String OZ, String UZ, String ru, String en) {
        return DictionaryEntryEntity.builder()
            .category(category)
            .code(code)
            .labels(Map.of(
                "OZ", OZ,
                "UZ", UZ,
                "RU", ru,
                "EN", en
            ))
            .active(true)
            .build();
    }

    private ClassifierDepartmentEntity department(String name, String type) {
        return ClassifierDepartmentEntity.builder()
            .name(name)
            .departmentType(type)
            .active(true)
            .build();
    }

    private void seedRequiredProcessStages() {
        var desiredNames = REQUIRED_PROCESS_STAGES.stream()
            .map(ProcessStageSeed::name)
            .collect(java.util.stream.Collectors.toCollection(java.util.LinkedHashSet::new));

        classifierProcessStageRepository.findAll().stream()
            .filter(entity -> !desiredNames.contains(entity.getName()))
            .forEach(classifierProcessStageRepository::delete);

        REQUIRED_PROCESS_STAGES.forEach(stage -> {
            var entity = classifierProcessStageRepository.findByNameIgnoreCase(stage.name())
                .orElseGet(() -> ClassifierProcessStageEntity.builder().name(stage.name()).build());

            entity.setName(stage.name());
            entity.setDescription(stage.description());
            entity.setSortOrder(stage.sortOrder());
            entity.setActive(true);

            classifierProcessStageRepository.save(entity);
        });
    }

    private void seedRequiredServers() {
        REQUIRED_SERVERS.forEach(server -> {
            var entity = classifierServerRepository.findByNameIgnoreCase(server.name())
                .orElseGet(() -> ClassifierServerEntity.builder().name(server.name()).build());

            entity.setName(server.name());
            entity.setDescription(server.description());
            entity.setActive(true);

            classifierServerRepository.save(entity);
        });
    }

    private void seedRequiredStates() {
        REQUIRED_STATES.forEach(state -> {
            var entity = classifierStateRepository.findByCodeIgnoreCaseAndLangCodeIgnoreCase(state.code(), state.lang())
                .orElseGet(() -> ClassifierStateEntity.builder().code(state.code()).langCode(state.lang()).build());

            entity.setCode(state.code());
            entity.setLangCode(state.lang());
            entity.setName(state.name());
            entity.setActive(true);

            classifierStateRepository.save(entity);
        });
    }

    private void backfillControlStates() {
        var defaultState = classifierStateRepository.findByCodeIgnoreCaseAndLangCodeIgnoreCase(DEFAULT_STATE_CODE, DEFAULT_STATE_LANG)
            .map(state -> new StateSeed(state.getCode(), state.getLangCode(), state.getName()))
            .orElse(new StateSeed(DEFAULT_STATE_CODE, DEFAULT_STATE_LANG, "Yangi"));

        logicalControlRepository.findAll().forEach(control -> {
            var changed = false;
            if (control.getStateHistory() == null) {
                control.setStateHistory(new ArrayList<>());
                changed = true;
            }

            if (control.getCurrentStateCode() == null || control.getCurrentStateCode().isBlank()) {
                control.setCurrentStateCode(defaultState.code());
                changed = true;
            }
            if (control.getCurrentStateName() == null || control.getCurrentStateName().isBlank()) {
                control.setCurrentStateName(defaultState.name());
                changed = true;
            }
            if (control.getCurrentStateLang() == null || control.getCurrentStateLang().isBlank()) {
                control.setCurrentStateLang(defaultState.lang());
                changed = true;
            }

            if (control.getStateHistory().isEmpty()) {
                control.getStateHistory().add(LogicalControlStateHistoryEntity.builder()
                    .control(control)
                    .controlUniqueNumber(control.getUniqueNumber())
                    .stateCode(control.getCurrentStateCode())
                    .stateName(control.getCurrentStateName())
                    .stateLang(control.getCurrentStateLang())
                    .build());
                changed = true;
            }

            if (changed) {
                logicalControlRepository.save(control);
            }
        });
    }


    private ClassifierProcessStageEntity processStage(String name, String description) {
        return ClassifierProcessStageEntity.builder()
            .name(name)
            .description(description)
            .sortOrder(0)
            .active(true)
            .build();
    }

    private void seedRequiredSystemTypes() {
        var systemNames = List.of(
            "Yukli avtotransport (AT)",
            "Yuksuz avtotransport (MB)",
            "Temir yo'l (RW)",
            "Eksport uch qadam (EK)",
            "Tolling (TL)",
            "Elektron tijorat (EC)"
        );

        Arrays.asList("Ichki", "Tashqi").forEach(scopeType ->
            systemNames.forEach(systemName -> {
                if (!classifierSystemTypeRepository.existsBySystemNameIgnoreCaseAndScopeTypeIgnoreCase(systemName, scopeType)) {
                    classifierSystemTypeRepository.save(systemType(systemName, scopeType));
                }
            })
        );
    }

    private ClassifierSystemTypeEntity systemType(String systemName, String scopeType) {
        return ClassifierSystemTypeEntity.builder()
            .systemName(systemName)
            .scopeType(scopeType)
            .active(true)
            .build();
    }

    private LogicalControlEntity control(
        String code,
        String name,
        String systemName,
        LogicalControlEntity.DeploymentScope deploymentScope,
        LogicalControlEntity.DirectionType directionType,
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
            .processStage("Verifikatsiyadan o'tkazish")
            .authorName("system")
            .responsibleDepartment("Risk boshqarmasi")
            .status(LogicalControlEntity.ControlStatus.ACTIVE)
            .currentStateCode("NEW")
            .currentStateName("Yangi")
            .currentStateLang("OZ")
            .suspendedUntil(LocalDateTime.now().plusDays(3))
            .messages(Map.of(
                "OZ", "Shart bajarilmadi, deklaratsiyani qayta tekshiring",
                "UZ", "\u0428\u0430\u0440\u0442 \u0431\u0430\u0436\u0430\u0440\u0438\u043b\u043c\u0430\u0434\u0438, \u0434\u0435\u043a\u043b\u0430\u0440\u0430\u0446\u0438\u044f\u043d\u0438 \u049b\u0430\u0439\u0442\u0430 \u0442\u0435\u043a\u0448\u0438\u0440\u0438\u043d\u0433",
                "RU", "\u0423\u0441\u043b\u043e\u0432\u0438\u0435 \u043d\u0435 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u043e, \u043f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0434\u0435\u043a\u043b\u0430\u0440\u0430\u0446\u0438\u044e \u043f\u043e\u0432\u0442\u043e\u0440\u043d\u043e",
                "EN", "Condition failed, review declaration again"
            ))
            .phoneExtension(null)
            .priorityOrder(1)
            .confidentialityLevel("NON_CONFIDENTIAL")
            .smsNotificationEnabled(true)
            .smsPhones(new ArrayList<>(List.of("+998901112233", "+998977778899")))
            .deploymentScope(deploymentScope)
            .directionType(directionType)
            .versionNumber(3)
            .timeoutMs(3500)
            .lastExecutionDurationMs(742L)
            .territories(new ArrayList<>(List.of("Toshkent", "Samarqand")))
            .posts(new ArrayList<>(List.of("Yallama", "Aeroport")))
            .autoCancelAfterDays(90)
            .conflictMonitoringEnabled(true)
            .ruleBuilderCanvas(builderCanvas(name))
            .build();

        control.getStateHistory().add(LogicalControlStateHistoryEntity.builder()
            .control(control)
            .controlUniqueNumber(control.getUniqueNumber())
            .stateCode("NEW")
            .stateName("Yangi")
            .stateLang("OZ")
            .build());

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



