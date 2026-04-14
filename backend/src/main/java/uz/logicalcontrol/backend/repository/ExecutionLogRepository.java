package uz.logicalcontrol.backend.repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import uz.logicalcontrol.backend.entity.ExecutionLogEntity;

public interface ExecutionLogRepository extends JpaRepository<ExecutionLogEntity, UUID> {

    List<ExecutionLogEntity> findTop40ByOrderByInstimeDesc();

    List<ExecutionLogEntity> findTop20ByControlIdOrderByInstimeDesc(UUID controlId);

    List<ExecutionLogEntity> findTop8ByOrderByInstimeDesc();

    long countByControlId(UUID controlId);

    long countByInstimeBetween(Instant start, Instant end);

    long countByInstimeBetweenAndResult(Instant start, Instant end, ExecutionLogEntity.ExecutionResult result);
}
