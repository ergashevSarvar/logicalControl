package uz.logicalcontrol.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "classifier_departments")
public class ClassifierDepartmentEntity extends BaseEntity {

    @Column(nullable = false, length = 220)
    private String name;

    @Column(name = "department_type", nullable = false, length = 40)
    private String departmentType;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;
}
