package uz.logicalcontrol.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
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
@Table(name = "logical_control_conditions")
@SQLDelete(sql = "update logical_control_conditions set isdeleted = 1, deltime = current timestamp, updtime = current timestamp where id = ? and isdeleted = 0")
@SQLRestriction("isdeleted = 0")
public class LogicalControlConditionEntity extends AuditedUuidEntity {

    public enum ConditionType {
        INITIAL,
        ADDITIONAL
    }

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "control_id", nullable = false)
    private LogicalControlEntity control;

    @Enumerated(EnumType.STRING)
    @Column(name = "condition_type", nullable = false, length = 20)
    private ConditionType conditionType;

    @Column(name = "parameter_name", nullable = false, length = 80)
    private String parameterName;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;

    @Column(name = "server_name", nullable = false, length = 160)
    private String serverName;

    @Lob
    @Column(name = "sql_query", nullable = false)
    private String sqlQuery;
}
