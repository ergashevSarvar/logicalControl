package uz.logicalcontrol.backend.mn;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface LogicalControlOverviewRepository extends JpaRepository<LogicalControlOverviewEntity, UUID> {
}
