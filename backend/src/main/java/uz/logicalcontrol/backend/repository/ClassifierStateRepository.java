package uz.logicalcontrol.backend.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import uz.logicalcontrol.backend.entity.ClassifierStateEntity;

public interface ClassifierStateRepository extends JpaRepository<ClassifierStateEntity, UUID> {

    List<ClassifierStateEntity> findAllByOrderByCodeAscLangCodeAscNameAsc();

    List<ClassifierStateEntity> findAllByLangCodeIgnoreCaseOrderByCodeAscNameAsc(String langCode);

    boolean existsByCodeIgnoreCaseAndLangCodeIgnoreCase(String code, String langCode);

    boolean existsByCodeIgnoreCaseAndLangCodeIgnoreCaseAndIdNot(String code, String langCode, UUID id);

    Optional<ClassifierStateEntity> findByCodeIgnoreCaseAndLangCodeIgnoreCase(String code, String langCode);

    List<ClassifierStateEntity> findAllByCodeIgnoreCaseOrderByLangCodeAscNameAsc(String code);
}
