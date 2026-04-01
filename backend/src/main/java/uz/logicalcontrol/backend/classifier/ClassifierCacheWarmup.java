package uz.logicalcontrol.backend.classifier;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class ClassifierCacheWarmup {

    private final ClassifierService classifierService;

    @EventListener(ApplicationReadyEvent.class)
    public void warmUp() {
        classifierService.listDepartments();
        classifierService.listProcessStages();
        classifierService.listSystemTypes();
    }
}
