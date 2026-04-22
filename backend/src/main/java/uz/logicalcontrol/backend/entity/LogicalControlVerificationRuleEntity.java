package uz.logicalcontrol.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

@Getter
@Setter
@lombok.Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "logical_control_verification_rules")
@SQLDelete(sql = "update logical_control_verification_rules set isdeleted = 1, deltime = current timestamp, updtime = current timestamp where id = ? and isdeleted = 0")
@SQLRestriction("isdeleted = 0")
public class LogicalControlVerificationRuleEntity extends AuditedUuidEntity {

    public enum Joiner {
        AND,
        OR
    }

    public enum FieldSource {
        PARAMS,
        TABLE
    }

    public enum Operator {
        EQ,
        NOT_EQ,
        GT,
        GTE,
        LT,
        LTE,
        BETWEEN,
        CONTAINS,
        STARTS_WITH,
        ENDS_WITH,
        IS_NULL,
        IS_NOT_NULL
    }

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "verification_config_id", nullable = false)
    private LogicalControlVerificationConfigEntity verificationConfig;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Joiner joiner;

    @Enumerated(EnumType.STRING)
    @Column(name = "field_source", nullable = false, length = 20)
    private FieldSource fieldSource;

    @Column(name = "table_name", length = 255)
    private String tableName;

    @Column(name = "field_ref", nullable = false, length = 255)
    private String fieldRef;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Operator operator;

    @Column(name = "comparison_value", length = 2000)
    private String comparisonValue;

    @Column(name = "secondary_comparison_value", length = 2000)
    private String secondaryComparisonValue;
}
