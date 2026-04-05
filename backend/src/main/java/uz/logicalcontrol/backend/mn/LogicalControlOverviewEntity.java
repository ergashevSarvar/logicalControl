package uz.logicalcontrol.backend.mn;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "logical_control_overviews")
public class LogicalControlOverviewEntity {

    @Id
    @Column(name = "control_id", nullable = false, updatable = false)
    private UUID controlId;

    @Column(nullable = false, unique = true, length = 60)
    private String uniqueNumber;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 2000)
    private String objective;

    @Column(length = 255)
    private String basisFileName;

    @Column(length = 120)
    private String basisFileContentType;

    private Long basisFileSize;

    @JdbcTypeCode(SqlTypes.VARBINARY)
    @Column(name = "basis_file_data", columnDefinition = "bytea")
    private byte[] basisFileData;

    @Column(nullable = false, length = 160)
    private String systemName;

    private LocalDate startDate;

    private LocalDate finishDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LogicalControlEntity.ControlType controlType;

    @Column(nullable = false, length = 120)
    private String processStage;

    @Column(nullable = false)
    @Builder.Default
    private boolean smsNotificationEnabled = false;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
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

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private Instant updatedAt;
}
