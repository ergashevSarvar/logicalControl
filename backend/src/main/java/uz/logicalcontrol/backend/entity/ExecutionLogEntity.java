package uz.logicalcontrol.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;
import uz.logicalcontrol.backend.persistence.converter.ObjectMapJsonConverter;

@Getter
@Setter
@lombok.Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "execution_logs")
@SQLDelete(sql = "update execution_logs set isdeleted = 1, deltime = current timestamp, updtime = current timestamp where id = ? and isdeleted = 0")
@SQLRestriction("isdeleted = 0")
public class ExecutionLogEntity extends AuditedUuidEntity {

    public enum ExecutionResult {
        POSITIVE,
        NEGATIVE
    }

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "control_id", nullable = false)
    private LogicalControlEntity control;

    @Column(name = "instime", nullable = false, insertable = false, updatable = false)
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

    @Lob
    @Convert(converter = ObjectMapJsonConverter.class)
    @Column(nullable = false)
    @lombok.Builder.Default
    private Map<String, Object> details = new LinkedHashMap<>();

    @PrePersist
    @PreUpdate
    void syncExecutionTimeAlias() {
        if (getInsTime() == null && instime != null) {
            setInsTime(instime);
        }

        if (instime == null) {
            instime = getInsTime();
        }
    }

    @PostLoad
    void hydrateExecutionTimeAlias() {
        instime = getInsTime();
    }
}
