package uz.logicalcontrol.backend.exception;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ExceptionEntryRepository extends JpaRepository<ExceptionEntryEntity, UUID> {

    long countByActiveTrue();
}
