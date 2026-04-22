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
import jakarta.persistence.Table;
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
@Table(name = "logical_rules")
@SQLDelete(sql = "update logical_rules set isdeleted = 1, deltime = current timestamp, updtime = current timestamp where id = ? and isdeleted = 0")
@SQLRestriction("isdeleted = 0")
public class LogicalRuleEntity extends AuditedUuidEntity {

    public enum RuleType {
        CONDITION,
        GROUP,
        ACTION,
        RESULT
    }

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "control_id", nullable = false)
    private LogicalControlEntity control;

    @Column(nullable = false, length = 140, columnDefinition = "VARCHAR(140) CCSID 1208")
    private String name;

    @Column(length = 1000, columnDefinition = "VARCHAR(1000) CCSID 1208")
    private String description;

    @Column(nullable = false)
    @lombok.Builder.Default
    private Integer sortOrder = 0;

    @Column(nullable = false)
    @lombok.Builder.Default
    private boolean active = true;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RuleType ruleType;

    @Lob
    @Convert(converter = ObjectMapJsonConverter.class)
    @Column(nullable = false)
    @lombok.Builder.Default
    private Map<String, Object> definition = new LinkedHashMap<>();

    @Lob
    @Convert(converter = ObjectMapJsonConverter.class)
    @Column(nullable = false)
    @lombok.Builder.Default
    private Map<String, Object> visual = new LinkedHashMap<>();
}
