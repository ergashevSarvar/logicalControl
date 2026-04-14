package uz.logicalcontrol.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Setter
@lombok.Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "execution_logs")
public class ExecutionLogEntity extends BaseEntity {

    public enum ExecutionResult {
        POSITIVE,
        NEGATIVE
    }

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "control_id", nullable = false)
    private LogicalControlEntity control;

    @Column(nullable = false)
    private Instant instime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ExecutionResult result;

    @Column(length = 80)
    private String declarationId;

    @Column(length = 80)
    private String declarationUncodId;

    private Long durationMs;

    @Column(length = 140)
    private String matchedRuleName;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    @lombok.Builder.Default
    private Map<String, Object> details = new LinkedHashMap<>();
}
