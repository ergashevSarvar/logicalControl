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
@Table(name = "process_stages")
public class ClassifierProcessStageEntity extends BaseEntity {

    @Column(nullable = false, length = 180, columnDefinition = "VARCHAR(180) CCSID 1208")
    private String name;

    @Column(length = 1200, columnDefinition = "VARCHAR(1200) CCSID 1208")
    private String description;

    @Column(nullable = false)
    @Builder.Default
    private int sortOrder = 0;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;
}
