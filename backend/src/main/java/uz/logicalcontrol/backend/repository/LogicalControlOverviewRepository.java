package uz.logicalcontrol.backend.repository;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import uz.logicalcontrol.backend.entity.LogicalControlOverviewEntity;

public interface LogicalControlOverviewRepository extends JpaRepository<LogicalControlOverviewEntity, UUID> {
}
