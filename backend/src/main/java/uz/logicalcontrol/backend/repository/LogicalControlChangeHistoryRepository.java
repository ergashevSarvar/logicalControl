package uz.logicalcontrol.backend.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import uz.logicalcontrol.backend.entity.LogicalControlChangeHistoryEntity;

public interface LogicalControlChangeHistoryRepository extends JpaRepository<LogicalControlChangeHistoryEntity, UUID> {

    List<LogicalControlChangeHistoryEntity> findTop200ByControlIdOrderByChangedAtDesc(UUID controlId);
}
