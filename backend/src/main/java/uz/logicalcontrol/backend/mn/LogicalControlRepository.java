package uz.logicalcontrol.backend.mn;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface LogicalControlRepository extends JpaRepository<LogicalControlEntity, UUID> {

    List<LogicalControlEntity> findAllByOrderByUpdatedAtDesc();

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, UUID id);

    boolean existsByUniqueNumberIgnoreCase(String uniqueNumber);

    boolean existsByUniqueNumberIgnoreCaseAndIdNot(String uniqueNumber, UUID id);

    long countByStatus(LogicalControlEntity.ControlStatus status);
}
