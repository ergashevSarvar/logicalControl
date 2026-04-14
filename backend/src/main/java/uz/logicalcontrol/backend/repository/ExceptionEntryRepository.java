package uz.logicalcontrol.backend.repository;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import uz.logicalcontrol.backend.entity.ExceptionEntryEntity;

public interface ExceptionEntryRepository extends JpaRepository<ExceptionEntryEntity, UUID> {

    long countByActiveTrue();
}
