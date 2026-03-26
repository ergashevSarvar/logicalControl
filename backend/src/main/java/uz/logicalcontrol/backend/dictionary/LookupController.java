package uz.logicalcontrol.backend.dictionary;

import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import uz.logicalcontrol.backend.user.RoleRepository;

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
