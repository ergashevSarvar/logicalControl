package uz.logicalcontrol.backend.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import uz.logicalcontrol.backend.entity.ClassifierDepartmentEntity;

public interface ClassifierDepartmentRepository extends JpaRepository<ClassifierDepartmentEntity, UUID> {

    List<ClassifierDepartmentEntity> findAllByOrderByNameAsc();

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, UUID id);
}
