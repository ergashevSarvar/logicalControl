package uz.logicalcontrol.backend.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
import jakarta.persistence.Convert;
import jakarta.persistence.Lob;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;
import uz.logicalcontrol.backend.persistence.converter.ObjectMapJsonConverter;
import uz.logicalcontrol.backend.persistence.converter.StringListJsonConverter;
import uz.logicalcontrol.backend.persistence.converter.StringMapJsonConverter;

@Getter
@Setter
@lombok.Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "logical_controls")
@SQLDelete(sql = "update logical_controls set isdeleted = 1, deltime = current timestamp, updtime = current timestamp where id = ? and isdeleted = 0")
@SQLRestriction("isdeleted = 0")
public class LogicalControlEntity extends AuditedUuidEntity {

    public enum ControlType {
        WARNING,
        ALLOW,
        BLOCK
    }

    public enum ControlStatus {
        ACTIVE,
        CANCELLED,
        SUSPENDED
    }

    public enum DeploymentScope {
        INTERNAL,
        EXTERNAL,
        HYBRID
    }

    public enum DirectionType {
        ENTRY,
        EXIT
    }

    @Column(nullable = false, unique = true, length = 40)
    private String code;

    @Column(nullable = false, length = 200, columnDefinition = "VARCHAR(200) CCSID 1208")
    private String name;

    @Column(length = 2000, columnDefinition = "VARCHAR(2000) CCSID 1208")
    private String objective;

    @Column(length = 2000, columnDefinition = "VARCHAR(2000) CCSID 1208")
    private String basis;

    @Column(name = "table_name", length = 255)
    private String tableName;

    @Column(length = 255, columnDefinition = "VARCHAR(255) CCSID 1208")
    private String basisFileName;

    @Column(length = 120)
    private String basisFileContentType;

    private Long basisFileSize;

    @Lob
    @Column(name = "basis_file_data")
    private byte[] basisFileData;

    @Column(nullable = false, length = 160, columnDefinition = "VARCHAR(160) CCSID 1208")
    private String systemName;

    @Lob
    @Convert(converter = StringListJsonConverter.class)
    @Column(nullable = false, columnDefinition = "CLOB(1048576) CCSID 1208")
    @lombok.Builder.Default
    private List<String> approvers = new ArrayList<>();

    private LocalDate startDate;

    private LocalDate finishDate;

    @Column(nullable = false, unique = true, length = 60)
    private String uniqueNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ControlType controlType;

    @Column(nullable = false, length = 120, columnDefinition = "VARCHAR(120) CCSID 1208")
    private String processStage;

    @Column(nullable = false, length = 140, columnDefinition = "VARCHAR(140) CCSID 1208")
    private String authorName;

    @Column(nullable = false, length = 160, columnDefinition = "VARCHAR(160) CCSID 1208")
    private String responsibleDepartment;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ControlStatus status;

    @Column(name = "current_state_code", length = 80)
    private String currentStateCode;

    @Column(name = "current_state_name", length = 320, columnDefinition = "VARCHAR(320) CCSID 1208")
    private String currentStateName;

    @Column(name = "current_state_lang", length = 20)
    private String currentStateLang;

    private LocalDateTime suspendedUntil;

    @Lob
    @Convert(converter = StringMapJsonConverter.class)
    @Column(nullable = false, columnDefinition = "CLOB(1048576) CCSID 1208")
    @lombok.Builder.Default
    private Map<String, String> messages = new LinkedHashMap<>();

    @Column(length = 40)
    private String phoneExtension;

    private Integer priorityOrder;

    @Column(length = 60)
    private String confidentialityLevel;

    @Column(nullable = false)
    @lombok.Builder.Default
    private boolean smsNotificationEnabled = false;

    @Lob
    @Convert(converter = StringListJsonConverter.class)
    @Column(nullable = false)
    @lombok.Builder.Default
    private List<String> smsPhones = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DeploymentScope deploymentScope;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private DirectionType directionType;

    @Column(nullable = false)
    @lombok.Builder.Default
    private Integer versionNumber = 1;

    private Integer timeoutMs;

    private Long lastExecutionDurationMs;

    @Lob
    @Convert(converter = StringListJsonConverter.class)
    @Column(nullable = false)
    @lombok.Builder.Default
    private List<String> territories = new ArrayList<>();

    @Lob
    @Convert(converter = StringListJsonConverter.class)
    @Column(nullable = false)
    @lombok.Builder.Default
    private List<String> posts = new ArrayList<>();

    private Integer autoCancelAfterDays;

    @Column(nullable = false)
    @lombok.Builder.Default
    private boolean conflictMonitoringEnabled = true;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.CHAR)
    @Column(length = 36)
    private UUID copiedFromControlId;

    @Lob
    @Convert(converter = ObjectMapJsonConverter.class)
    @Column(nullable = false)
    @lombok.Builder.Default
    private Map<String, Object> ruleBuilderCanvas = new LinkedHashMap<>();

    @OneToMany(mappedBy = "control", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    @lombok.Builder.Default
    private List<LogicalRuleEntity> rules = new ArrayList<>();

    @OneToMany(mappedBy = "control", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    @lombok.Builder.Default
    private List<LogicalControlConditionEntity> conditions = new ArrayList<>();

    @OneToMany(mappedBy = "control", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    @lombok.Builder.Default
    private List<LogicalControlApproverDepartmentEntity> approverDepartments = new ArrayList<>();

    @OneToMany(mappedBy = "control", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("insTime DESC")
    @lombok.Builder.Default
    private List<LogicalControlStateHistoryEntity> stateHistory = new ArrayList<>();

    @OneToOne(mappedBy = "control", cascade = CascadeType.ALL, orphanRemoval = true)
    private LogicalControlVerificationConfigEntity verificationConfig;

    @OneToOne(mappedBy = "control", cascade = CascadeType.ALL, orphanRemoval = true)
    private LogicalControlWarningConfigEntity warningConfig;
}
