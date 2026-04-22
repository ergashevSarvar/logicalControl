package uz.logicalcontrol.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;
import uz.logicalcontrol.backend.persistence.converter.StringMapJsonConverter;

@Getter
@Setter
@lombok.Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "dictionary_entries")
@SQLDelete(sql = "update dictionary_entries set isdeleted = 1, deltime = current timestamp, updtime = current timestamp where id = ? and isdeleted = 0")
@SQLRestriction("isdeleted = 0")
public class DictionaryEntryEntity extends AuditedUuidEntity {

    @Column(nullable = false, length = 60)
    private String category;

    @Column(nullable = false, length = 80)
    private String code;

    @Lob
    @Convert(converter = StringMapJsonConverter.class)
    @Column(nullable = false, columnDefinition = "CLOB(1048576) CCSID 1208")
    @lombok.Builder.Default
    private Map<String, String> labels = new LinkedHashMap<>();

    @Column(nullable = false)
    @lombok.Builder.Default
    private boolean active = true;
}
