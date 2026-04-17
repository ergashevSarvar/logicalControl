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
@Table(name = "classifier_servers")
public class ClassifierServerEntity extends BaseEntity {

    @Column(nullable = false, length = 220)
    private String name;

    @Column(length = 1200)
    private String description;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;
}
