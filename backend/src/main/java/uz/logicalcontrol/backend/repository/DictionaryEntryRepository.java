package uz.logicalcontrol.backend.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import uz.logicalcontrol.backend.entity.DictionaryEntryEntity;

public interface DictionaryEntryRepository extends JpaRepository<DictionaryEntryEntity, UUID> {

    List<DictionaryEntryEntity> findAllByActiveTrueOrderByCategoryAscCodeAsc();
}
