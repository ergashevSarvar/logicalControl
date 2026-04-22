package uz.logicalcontrol.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "logical_control_warning_messages")
@SQLDelete(sql = "update logical_control_warning_messages set isdeleted = 1, deltime = current timestamp, updtime = current timestamp where id = ? and isdeleted = 0")
@SQLRestriction("isdeleted = 0")
public class LogicalControlWarningMessageEntity extends AuditedUuidEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "warning_config_id", nullable = false)
    private LogicalControlWarningConfigEntity warningConfig;

    @Column(name = "locale_code", nullable = false, length = 20)
    private String localeCode;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;

    @Lob
    @Column(name = "message_text", columnDefinition = "CLOB(1048576) CCSID 1208")
    private String messageText;
}
