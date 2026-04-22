package uz.logicalcontrol.backend.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;
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
@Table(name = "logical_control_verification_configs")
@SQLDelete(sql = "update logical_control_verification_configs set isdeleted = 1, deltime = current timestamp, updtime = current timestamp where id = ? and isdeleted = 0")
@SQLRestriction("isdeleted = 0")
public class LogicalControlVerificationConfigEntity extends AuditedUuidEntity {

    public enum TriggerMode {
        TRUE,
        FALSE
    }

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "control_id", nullable = false, unique = true)
    private LogicalControlEntity control;

    @Enumerated(EnumType.STRING)
    @Column(name = "trigger_mode", nullable = false, length = 10)
    private TriggerMode triggerMode;

    @OneToMany(mappedBy = "verificationConfig", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    @lombok.Builder.Default
    private List<LogicalControlVerificationRuleEntity> rules = new ArrayList<>();
}
