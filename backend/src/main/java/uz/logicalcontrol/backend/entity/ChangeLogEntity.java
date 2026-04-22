package uz.logicalcontrol.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
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
@Table(name = "change_logs")
@SQLDelete(sql = "update change_logs set isdeleted = 1, deltime = current timestamp, updtime = current timestamp where id = ? and isdeleted = 0")
@SQLRestriction("isdeleted = 0")
public class ChangeLogEntity extends AuditedUuidEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "control_id", nullable = false)
    private LogicalControlEntity control;

    @Column(nullable = false, length = 140)
    private String actor;

    @Column(nullable = false, length = 40)
    private String action;

    @Column(nullable = false)
    private Instant changedAt;

    @Lob
    @Convert(converter = ObjectMapJsonConverter.class)
    @Column(nullable = false)
    @lombok.Builder.Default
    private Map<String, Object> details = new LinkedHashMap<>();
}
