package uz.logicalcontrol.backend.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import uz.logicalcontrol.backend.entity.ClassifierServerEntity;

public interface ClassifierServerRepository extends JpaRepository<ClassifierServerEntity, UUID> {

    List<ClassifierServerEntity> findAllByOrderByNameAsc();

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, UUID id);

    Optional<ClassifierServerEntity> findByNameIgnoreCase(String name);
}
