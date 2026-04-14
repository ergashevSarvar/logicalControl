package uz.logicalcontrol.backend.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import uz.logicalcontrol.backend.entity.ChangeLogEntity;

public interface ChangeLogRepository extends JpaRepository<ChangeLogEntity, UUID> {

    List<ChangeLogEntity> findTop20ByControlIdOrderByChangedAtDesc(UUID controlId);
}
