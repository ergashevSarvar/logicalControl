package uz.logicalcontrol.backend.exception;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import uz.logicalcontrol.backend.common.BaseEntity;

@Getter
@Setter
@lombok.Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "exception_entries")
public class ExceptionEntryEntity extends BaseEntity {

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
