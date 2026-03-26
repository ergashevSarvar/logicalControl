package uz.logicalcontrol.backend.mn;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import uz.logicalcontrol.backend.common.BaseEntity;

@Getter
@Setter
@lombok.Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "logical_controls")
public class LogicalControlEntity extends BaseEntity {

    public enum SystemName {
        AT,
        EK,
        RW,
        EC
    }

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

    @Column(nullable = false, unique = true, length = 40)
    private String code;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 2000)
    private String objective;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private SystemName systemName;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    @lombok.Builder.Default
    private List<String> approvers = new ArrayList<>();

    private LocalDate startDate;

    private LocalDate finishDate;

    @Column(nullable = false, unique = true, length = 60)
    private String uniqueNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ControlType controlType;

    @Column(nullable = false, length = 120)
    private String processStage;

    @Column(nullable = false, length = 140)
    private String authorName;

    @Column(nullable = false, length = 160)
    private String responsibleDepartment;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ControlStatus status;

    private LocalDateTime suspendedUntil;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
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

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    @lombok.Builder.Default
    private List<String> smsPhones = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DeploymentScope deploymentScope;

    @Column(nullable = false)
    @lombok.Builder.Default
    private Integer versionNumber = 1;

    private Integer timeoutMs;

    private Long lastExecutionDurationMs;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    @lombok.Builder.Default
    private List<String> territories = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    @lombok.Builder.Default
    private List<String> posts = new ArrayList<>();

    private Integer autoCancelAfterDays;

    @Column(nullable = false)
    @lombok.Builder.Default
    private boolean conflictMonitoringEnabled = true;

    private UUID copiedFromControlId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    @lombok.Builder.Default
    private Map<String, Object> ruleBuilderCanvas = new LinkedHashMap<>();

    @OneToMany(mappedBy = "control", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    @lombok.Builder.Default
    private List<LogicalRuleEntity> rules = new ArrayList<>();
}
