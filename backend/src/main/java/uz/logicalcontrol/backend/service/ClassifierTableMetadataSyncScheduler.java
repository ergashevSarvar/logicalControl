package uz.logicalcontrol.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import uz.logicalcontrol.backend.config.ClassifierTableSyncProperties;

@Service
public class ClassifierTableMetadataSyncScheduler {

    private static final Logger log = LoggerFactory.getLogger(ClassifierTableMetadataSyncScheduler.class);

    private final ClassifierTableMetadataSyncService classifierTableMetadataSyncService;
    private final ClassifierTableSyncProperties classifierTableSyncProperties;

    public ClassifierTableMetadataSyncScheduler(
        ClassifierTableMetadataSyncService classifierTableMetadataSyncService,
        ClassifierTableSyncProperties classifierTableSyncProperties
    ) {
        this.classifierTableMetadataSyncService = classifierTableMetadataSyncService;
        this.classifierTableSyncProperties = classifierTableSyncProperties;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void syncOnStartup() {
        if (!classifierTableSyncProperties.isEnabled() || !classifierTableSyncProperties.isRunOnStartup()) {
            return;
        }

        triggerSync("startup");
    }

    @Scheduled(
        fixedDelayString = "${app.classifier-table-sync.fixed-delay-ms:21600000}",
        initialDelayString = "${app.classifier-table-sync.initial-delay-ms:21600000}"
    )
    public void syncOnSchedule() {
        if (!classifierTableSyncProperties.isEnabled()) {
            return;
        }

        triggerSync("scheduled");
    }

    private void triggerSync(String trigger) {
        try {
            var summary = classifierTableMetadataSyncService.syncMetadataFromEtranzit();
            log.info(
                "Classifier table metadata sync ({}) completed: tables processed={}, inserted={}, updated={}, deleted={}, columns inserted={}, updated={}, deleted={}",
                trigger,
                summary.processedTables(),
                summary.insertedTables(),
                summary.updatedTables(),
                summary.deletedTables(),
                summary.insertedColumns(),
                summary.updatedColumns(),
                summary.deletedColumns()
            );
        } catch (Exception exception) {
            log.error("Classifier table metadata sync ({}) failed", trigger, exception);
        }
    }
}
