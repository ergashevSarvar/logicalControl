package uz.logicalcontrol.backend.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "app.sql-runner")
public class SqlQueryRunnerProperties {

    private boolean enabled = true;
    private int maxResultRows = 1000;
    private int queryTimeoutSeconds = 120;
    private int historyTtlMinutes = 15;
    private final Etranzit etranzit = new Etranzit();

    @Getter
    @Setter
    public static class Etranzit {

        private String allowedServerName = "etran.db.gtk";
        private String jdbcUrl = "jdbc:as400://etran.db.gtk/ETRANZIT";
        private String username = "etranzits";
        private String password = "nB4EaEtU";
        private String driverClassName = "com.ibm.as400.access.AS400JDBCDriver";
    }
}
