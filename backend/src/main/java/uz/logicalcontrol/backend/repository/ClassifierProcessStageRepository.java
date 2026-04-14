package uz.logicalcontrol.backend.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import uz.logicalcontrol.backend.entity.ClassifierProcessStageEntity;

public interface ClassifierProcessStageRepository extends JpaRepository<ClassifierProcessStageEntity, UUID> {

    List<ClassifierProcessStageEntity> findAllByOrderBySortOrderAscNameAsc();

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, UUID id);

    java.util.Optional<ClassifierProcessStageEntity> findByNameIgnoreCase(String name);

    @org.springframework.data.jpa.repository.Query("select coalesce(max(entity.sortOrder), 0) from ClassifierProcessStageEntity entity")
    int findMaxSortOrder();
}
