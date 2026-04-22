package uz.logicalcontrol.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "state_h")
@SQLDelete(sql = "update state_h set isdeleted = 1, deltime = current timestamp, updtime = current timestamp where id = ? and isdeleted = 0")
@SQLRestriction("isdeleted = 0")
public class LogicalControlStateHistoryEntity extends AuditedUuidEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "control_id", nullable = false)
    private LogicalControlEntity control;

    @Column(name = "control_unique_number", nullable = false, length = 60)
    private String controlUniqueNumber;

    @Column(name = "state_code", nullable = false, length = 80)
    private String stateCode;

    @Column(name = "state_name", nullable = false, length = 320, columnDefinition = "VARCHAR(320) CCSID 1208")
    private String stateName;

    @Column(name = "state_lang", nullable = false, length = 20)
    private String stateLang;
}
