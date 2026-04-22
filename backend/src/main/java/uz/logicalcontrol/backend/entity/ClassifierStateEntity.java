package uz.logicalcontrol.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
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
@Table(
    name = "states",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_states_code_lang", columnNames = {"code", "lang"})
    }
)
public class ClassifierStateEntity extends BaseEntity {

    @Column(nullable = false, length = 80)
    private String code;

    @Column(nullable = false, length = 320, columnDefinition = "VARCHAR(320) CCSID 1208")
    private String name;

    @Column(name = "lang", nullable = false, length = 20)
    private String langCode;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;
}
