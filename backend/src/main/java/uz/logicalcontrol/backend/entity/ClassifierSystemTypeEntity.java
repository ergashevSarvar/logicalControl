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
@Table(name = "classifier_system_types")
public class ClassifierSystemTypeEntity extends BaseEntity {

    @Column(name = "system_name", nullable = false, length = 120)
    private String systemName;

    @Column(name = "scope_type", nullable = false, length = 20)
    private String scopeType;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;
}
