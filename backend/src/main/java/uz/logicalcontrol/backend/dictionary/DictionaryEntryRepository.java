package uz.logicalcontrol.backend.dictionary;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DictionaryEntryRepository extends JpaRepository<DictionaryEntryEntity, UUID> {

    List<DictionaryEntryEntity> findAllByActiveTrueOrderByCategoryAscCodeAsc();
}
