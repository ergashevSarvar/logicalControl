package uz.logicalcontrol.backend.logging;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ChangeLogRepository extends JpaRepository<ChangeLogEntity, UUID> {

    List<ChangeLogEntity> findTop20ByControlIdOrderByChangedAtDesc(UUID controlId);
}
