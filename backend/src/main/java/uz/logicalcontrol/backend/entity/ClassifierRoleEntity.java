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
@Table(name = "control_roles")
public class ClassifierRoleEntity extends BaseEntity {

    @Column(nullable = false, unique = true, length = 220, columnDefinition = "VARCHAR(220) CCSID 1208")
    private String name;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;
}
