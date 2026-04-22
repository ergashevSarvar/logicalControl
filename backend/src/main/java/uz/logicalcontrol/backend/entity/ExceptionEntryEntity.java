package uz.logicalcontrol.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.LocalDate;
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
@Table(name = "exception_entries")
@SQLDelete(sql = "update exception_entries set isdeleted = 1, deltime = current timestamp, updtime = current timestamp where id = ? and isdeleted = 0")
@SQLRestriction("isdeleted = 0")
public class ExceptionEntryEntity extends AuditedUuidEntity {

    @Column(nullable = false, length = 80)
    private String exceptionType;

    @Column(nullable = false, length = 120)
    private String subjectKey;

    @Column(length = 500)
    private String description;

    private LocalDate validFrom;

    private LocalDate validTo;

    @Column(nullable = false)
    @lombok.Builder.Default
    private boolean active = true;
}
