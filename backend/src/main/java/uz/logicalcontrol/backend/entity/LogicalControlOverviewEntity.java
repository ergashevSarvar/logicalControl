package uz.logicalcontrol.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
import jakarta.persistence.Id;
import jakarta.persistence.Convert;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;
import uz.logicalcontrol.backend.persistence.converter.StringListJsonConverter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "logical_control_overviews")
@SQLDelete(sql = "update logical_control_overviews set isdeleted = 1, deltime = current timestamp, updtime = current timestamp where control_id = ? and isdeleted = 0")
@SQLRestriction("isdeleted = 0")
public class LogicalControlOverviewEntity extends AbstractAuditingEntity {

    @Id
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.CHAR)
    @Column(name = "control_id", nullable = false, updatable = false, length = 36)
    private UUID controlId;

    @Column(nullable = false, unique = true, length = 60)
    private String uniqueNumber;

    @Column(nullable = false, length = 200, columnDefinition = "VARCHAR(200) CCSID 1208")
    private String name;

    @Column(length = 2000, columnDefinition = "VARCHAR(2000) CCSID 1208")
    private String objective;

    @Column(length = 2000, columnDefinition = "VARCHAR(2000) CCSID 1208")
    private String basis;

    @Column(name = "table_name", length = 255)
    private String tableName;

    @Column(length = 255, columnDefinition = "VARCHAR(255) CCSID 1208")
    private String basisFileName;

    @Column(length = 120)
    private String basisFileContentType;

    private Long basisFileSize;

    @Lob
    @Column(name = "basis_file_data")
    private byte[] basisFileData;

    @Column(nullable = false, length = 160, columnDefinition = "VARCHAR(160) CCSID 1208")
    private String systemName;

    private LocalDate startDate;

    private LocalDate finishDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LogicalControlEntity.ControlType controlType;

    @Column(nullable = false, length = 120, columnDefinition = "VARCHAR(120) CCSID 1208")
    private String processStage;

    @Column(nullable = false)
    @Builder.Default
    private boolean smsNotificationEnabled = false;

    @Lob
    @Convert(converter = StringListJsonConverter.class)
    @Column(nullable = false)
    @Builder.Default
    private List<String> smsPhones = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LogicalControlEntity.DeploymentScope deploymentScope;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private LogicalControlEntity.DirectionType directionType;

    @Column(length = 60)
    private String confidentialityLevel;

}
