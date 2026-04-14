package uz.logicalcontrol.backend.controller;

import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import uz.logicalcontrol.backend.entity.DictionaryEntryEntity;
import uz.logicalcontrol.backend.repository.DictionaryEntryRepository;
import uz.logicalcontrol.backend.repository.RoleRepository;

@RestController
@RequestMapping("/api/lookups")
@RequiredArgsConstructor
public class LookupController {

    private final DictionaryEntryRepository dictionaryEntryRepository;
    private final RoleRepository roleRepository;

    @GetMapping("/bootstrap")
    public ResponseEntity<Map<String, Object>> bootstrap() {
        var dictionaries = dictionaryEntryRepository.findAllByActiveTrueOrderByCategoryAscCodeAsc().stream()
            .collect(Collectors.groupingBy(
                DictionaryEntryEntity::getCategory,
                Collectors.mapping(entry -> Map.of(
                    "code", entry.getCode(),
                    "labels", entry.getLabels()
                ), Collectors.toList())
            ));

        var roles = roleRepository.findAllByOrderByNameAsc().stream()
            .map(role -> Map.of(
                "code", role.getCode(),
                "name", role.getName()
            ))
            .toList();

        return ResponseEntity.ok(Map.of(
            "dictionaries", dictionaries,
            "roles", roles
        ));
    }
}
