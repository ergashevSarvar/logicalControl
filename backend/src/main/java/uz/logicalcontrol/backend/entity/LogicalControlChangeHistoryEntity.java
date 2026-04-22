package uz.logicalcontrol.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
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
@Table(name = "change_h")
@SQLDelete(sql = "update change_h set isdeleted = 1, deltime = current timestamp, updtime = current timestamp where id = ? and isdeleted = 0")
@SQLRestriction("isdeleted = 0")
public class LogicalControlChangeHistoryEntity extends AuditedUuidEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "control_id", nullable = false)
    private LogicalControlEntity control;

    @Column(name = "control_unique_number", nullable = false, length = 60)
    private String controlUniqueNumber;

    @Column(nullable = false, length = 50)
    private String actor;

    @Column(name = "changed_at", nullable = false)
    private Instant changedAt;

    @Column(name = "field_path", nullable = false, length = 255, columnDefinition = "VARCHAR(255) CCSID 1208")
    private String fieldPath;

    @Lob
    @Column(name = "old_value", columnDefinition = "CLOB(1048576) CCSID 1208")
    private String oldValue;

    @Lob
    @Column(name = "new_value", columnDefinition = "CLOB(1048576) CCSID 1208")
    private String newValue;
}
