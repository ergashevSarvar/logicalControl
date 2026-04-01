package uz.logicalcontrol.backend.classifier;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ClassifierSystemTypeRepository extends JpaRepository<ClassifierSystemTypeEntity, UUID> {

    List<ClassifierSystemTypeEntity> findAllByOrderBySystemNameAscScopeTypeAsc();

    boolean existsBySystemNameIgnoreCaseAndScopeTypeIgnoreCase(String systemName, String scopeType);

    boolean existsBySystemNameIgnoreCaseAndScopeTypeIgnoreCaseAndIdNot(String systemName, String scopeType, UUID id);
}
