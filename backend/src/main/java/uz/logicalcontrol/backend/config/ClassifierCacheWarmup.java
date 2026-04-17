package uz.logicalcontrol.backend.config;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import uz.logicalcontrol.backend.service.ClassifierService;

@Component
@RequiredArgsConstructor
public class ClassifierCacheWarmup {

    private final ClassifierService classifierService;

    @EventListener(ApplicationReadyEvent.class)
    public void warmUp() {
        classifierService.listDepartments();
        classifierService.listProcessStages();
        classifierService.listSystemTypes();
        classifierService.listTables();
        classifierService.listServers();
    }
}

