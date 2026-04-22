package uz.logicalcontrol.backend.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import uz.logicalcontrol.backend.entity.ClassifierRoleEntity;

public interface ClassifierRoleRepository extends JpaRepository<ClassifierRoleEntity, UUID> {

    List<ClassifierRoleEntity> findAllByOrderByNameAsc();

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, UUID id);

    Optional<ClassifierRoleEntity> findByNameIgnoreCase(String name);
}
