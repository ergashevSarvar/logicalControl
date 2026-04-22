package uz.logicalcontrol.backend.repository;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import uz.logicalcontrol.backend.entity.LogicalControlEntity;

public interface LogicalControlRepository extends JpaRepository<LogicalControlEntity, UUID> {

    List<LogicalControlEntity> findAllByOrderByUpdTimeDesc();

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, UUID id);

    boolean existsByUniqueNumberIgnoreCase(String uniqueNumber);

    boolean existsByUniqueNumberIgnoreCaseAndIdNot(String uniqueNumber, UUID id);

    long countByStatus(LogicalControlEntity.ControlStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select control from LogicalControlEntity control where control.id = :id")
    Optional<LogicalControlEntity> findForUpdateById(@Param("id") UUID id);
}
