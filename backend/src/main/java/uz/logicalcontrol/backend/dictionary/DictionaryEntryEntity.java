package uz.logicalcontrol.backend.dictionary;

import java.util.LinkedHashMap;
import java.util.Map;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

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
@Table(name = "dictionary_entries")
public class DictionaryEntryEntity extends BaseEntity {

    @Column(nullable = false, length = 60)
    private String category;

    @Column(nullable = false, length = 80)
    private String code;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    @lombok.Builder.Default
    private Map<String, String> labels = new LinkedHashMap<>();

    @Column(nullable = false)
    @lombok.Builder.Default
    private boolean active = true;
}
