package uz.logicalcontrol.backend.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "app.classifier-table-sync")
public class ClassifierTableSyncProperties {

    private boolean enabled = true;
    private boolean runOnStartup = true;
    private long initialDelayMs = 21_600_000L;
    private long fixedDelayMs = 21_600_000L;
    private String schemaName = "ETRANZIT";
}
