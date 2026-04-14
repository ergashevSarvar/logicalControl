package uz.logicalcontrol.backend.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import uz.logicalcontrol.backend.entity.ClassifierSystemTypeEntity;

public interface ClassifierSystemTypeRepository extends JpaRepository<ClassifierSystemTypeEntity, UUID> {

    List<ClassifierSystemTypeEntity> findAllByOrderBySystemNameAscScopeTypeAsc();

    boolean existsBySystemNameIgnoreCaseAndScopeTypeIgnoreCase(String systemName, String scopeType);

    boolean existsBySystemNameIgnoreCaseAndScopeTypeIgnoreCaseAndIdNot(String systemName, String scopeType, UUID id);
}
