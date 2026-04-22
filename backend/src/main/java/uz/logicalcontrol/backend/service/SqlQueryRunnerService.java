package uz.logicalcontrol.backend.service;

import jakarta.annotation.PreDestroy;
import jakarta.persistence.EntityNotFoundException;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.sql.Blob;
import java.sql.Clob;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.SQLXML;
import java.sql.Statement;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import uz.logicalcontrol.backend.config.SqlQueryRunnerProperties;
import uz.logicalcontrol.backend.payload.SqlRunnerDtos;
import uz.logicalcontrol.backend.security.SecurityActorResolver;

@Service
public class SqlQueryRunnerService {

    private static final List<String> FORBIDDEN_SQL_KEYWORDS = List.of(
        "INSERT",
        "UPDATE",
        "DELETE",
        "MERGE",
        "ALTER",
        "DROP",
        "TRUNCATE",
        "CREATE",
        "CALL"
    );

    private final SqlQueryRunnerProperties properties;
    private final SecurityActorResolver securityActorResolver;
    private final ConcurrentMap<UUID, QueryExecutionHandle> executions = new ConcurrentHashMap<>();
    private final ExecutorService executorService = Executors.newVirtualThreadPerTaskExecutor();
    private volatile HikariDataSource etranzitSqlRunnerDataSource;

    public SqlQueryRunnerService(SqlQueryRunnerProperties properties, SecurityActorResolver securityActorResolver) {
        this.properties = properties;
        this.securityActorResolver = securityActorResolver;
    }

    public SqlRunnerDtos.QueryExecutionStartResponse startExecution(
        SqlRunnerDtos.QueryExecutionRequest request,
        Authentication authentication
    ) {
        cleanupExpiredExecutions();
        ensureRunnerEnabled();

        var normalizedServerName = normalizeServerName(request.serverName());
        validateServerName(normalizedServerName);
        var normalizedSql = normalizeSql(request.sql());
        validateSql(normalizedSql);

        var handle = new QueryExecutionHandle(
            UUID.randomUUID(),
            resolveActor(authentication),
            normalizedServerName,
            normalizedSql
        );
        executions.put(handle.id(), handle);
        handle.attachFuture(executorService.submit(() -> executeQuery(handle)));

        return new SqlRunnerDtos.QueryExecutionStartResponse(
            handle.id(),
            handle.status(),
            handle.logMessage(),
            handle.isStopAvailable()
        );
    }

    public SqlRunnerDtos.QueryExecutionStatusResponse getExecution(UUID executionId, Authentication authentication) {
        cleanupExpiredExecutions();
        return toStatusResponse(getExecutionHandle(executionId, authentication));
    }

    public SqlRunnerDtos.QueryExecutionStatusResponse cancelExecution(UUID executionId, Authentication authentication) {
        cleanupExpiredExecutions();
        var handle = getExecutionHandle(executionId, authentication);
        handle.cancel();
        return toStatusResponse(handle);
    }

    @PreDestroy
    public void shutdown() {
        executorService.shutdownNow();
        var dataSource = etranzitSqlRunnerDataSource;
        if (dataSource != null && !dataSource.isClosed()) {
            dataSource.close();
        }
    }

    private void executeQuery(QueryExecutionHandle handle) {
        if (handle.isCancellationRequested()) {
            handle.markCancelled("Query foydalanuvchi tomonidan to'xtatildi");
            return;
        }

        handle.markRunning();

        try (
            Connection connection = getOrCreateDataSource().getConnection();
            Statement statement = connection.createStatement()
        ) {
            statement.setQueryTimeout(Math.max(1, properties.getQueryTimeoutSeconds()));
            statement.setMaxRows(Math.max(1, properties.getMaxResultRows()) + 1);
            handle.attachStatement(statement);

            if (handle.isCancellationRequested()) {
                handle.markCancelled("Query foydalanuvchi tomonidan to'xtatildi");
                return;
            }

            var hasResultSet = statement.execute(handle.sql());
            if (!hasResultSet) {
                handle.markFailed("Faqat natija qaytaradigan SELECT yoki WITH query ishlaydi");
                return;
            }

            try (ResultSet resultSet = statement.getResultSet()) {
                var metadata = resultSet.getMetaData();
                var columnCount = metadata.getColumnCount();
                var columns = new ArrayList<String>(columnCount);
                for (var index = 1; index <= columnCount; index++) {
                    var label = trimToNull(metadata.getColumnLabel(index));
                    columns.add(label == null ? "column" + index : label);
                }

                var rows = new ArrayList<List<String>>();
                while (resultSet.next()) {
                    if (handle.isCancellationRequested()) {
                        handle.markCancelled("Query foydalanuvchi tomonidan to'xtatildi");
                        return;
                    }

                    var row = new ArrayList<String>(columnCount);
                    for (var index = 1; index <= columnCount; index++) {
                        row.add(stringifyValue(resultSet.getObject(index)));
                    }
                    rows.add(Collections.unmodifiableList(new ArrayList<>(row)));
                }

                var truncated = rows.size() > properties.getMaxResultRows();
                if (truncated) {
                    rows.remove(rows.size() - 1);
                }

                handle.markCompleted(
                    new SqlRunnerDtos.QueryExecutionResult(
                        List.copyOf(columns),
                        List.copyOf(rows),
                        rows.size(),
                        truncated
                    ),
                    rows.isEmpty()
                        ? "Natija topilmadi"
                        : "Natija muvaffaqiyatli yuklandi"
                );
            }
        } catch (SQLException exception) {
            if (handle.isCancellationRequested()) {
                handle.markCancelled("Query foydalanuvchi tomonidan to'xtatildi");
                return;
            }

            handle.markFailed(extractSqlErrorMessage(exception));
        } catch (RuntimeException exception) {
            if (handle.isCancellationRequested()) {
                handle.markCancelled("Query foydalanuvchi tomonidan to'xtatildi");
                return;
            }

            var exceptionMessage = trimToNull(exception.getMessage());
            handle.markFailed(
                exceptionMessage == null
                    ? "SQL query bajarilmadi (" + exception.getClass().getSimpleName() + ")"
                    : exceptionMessage
            );
        } finally {
            handle.detachStatement();
        }
    }

    private QueryExecutionHandle getExecutionHandle(UUID executionId, Authentication authentication) {
        var actor = resolveActor(authentication);
        var handle = executions.get(executionId);
        if (handle == null || !handle.belongsTo(actor)) {
            throw new EntityNotFoundException("SQL execution topilmadi: " + executionId);
        }

        return handle;
    }

    private SqlRunnerDtos.QueryExecutionStatusResponse toStatusResponse(QueryExecutionHandle handle) {
        return new SqlRunnerDtos.QueryExecutionStatusResponse(
            handle.id(),
            handle.status(),
            handle.serverName(),
            handle.logMessage(),
            handle.errorMessage(),
            handle.isStopAvailable(),
            handle.createdAt(),
            handle.startedAt(),
            handle.finishedAt(),
            handle.result()
        );
    }

    private void cleanupExpiredExecutions() {
        var threshold = Instant.now().minus(properties.getHistoryTtlMinutes(), ChronoUnit.MINUTES);
        executions.entrySet().removeIf(entry -> entry.getValue().isExpired(threshold));
    }

    private HikariDataSource getOrCreateDataSource() {
        var current = etranzitSqlRunnerDataSource;
        if (current != null && !current.isClosed()) {
            return current;
        }

        synchronized (this) {
            current = etranzitSqlRunnerDataSource;
            if (current != null && !current.isClosed()) {
                return current;
            }

            var settings = properties.getEtranzit();
            var hikariConfig = new HikariConfig();
            hikariConfig.setPoolName("etranzit-sql-runner");
            hikariConfig.setDriverClassName(settings.getDriverClassName());
            hikariConfig.setJdbcUrl(settings.getJdbcUrl());
            hikariConfig.setUsername(settings.getUsername());
            hikariConfig.setPassword(settings.getPassword());
            hikariConfig.setAutoCommit(true);
            hikariConfig.setConnectionTimeout(30_000);
            hikariConfig.setValidationTimeout(5_000);
            hikariConfig.setMinimumIdle(0);
            hikariConfig.setMaximumPoolSize(4);
            hikariConfig.setIdleTimeout(300_000);
            hikariConfig.setMaxLifetime(900_000);
            hikariConfig.setInitializationFailTimeout(-1);
            hikariConfig.setConnectionTestQuery("select current_timestamp cts from sysibm.sysdummy1");
            etranzitSqlRunnerDataSource = new HikariDataSource(hikariConfig);
            return etranzitSqlRunnerDataSource;
        }
    }

    private void ensureRunnerEnabled() {
        if (!properties.isEnabled()) {
            throw new IllegalArgumentException("SQL runner hozircha o'chirilgan");
        }
    }

    private void validateServerName(String serverName) {
        var allowedServerName = normalizeServerName(properties.getEtranzit().getAllowedServerName());
        if (!allowedServerName.equalsIgnoreCase(serverName)) {
            throw new IllegalArgumentException("Hozircha faqat " + allowedServerName + " serveri qo'llab-quvvatlanadi");
        }
    }

    private void validateSql(String sql) {
        var upperSql = sql.toUpperCase(Locale.ROOT);
        if (!(upperSql.startsWith("SELECT") || upperSql.startsWith("WITH"))) {
            throw new IllegalArgumentException("Faqat SELECT yoki WITH bilan boshlanadigan query ishlaydi");
        }

        for (var keyword : FORBIDDEN_SQL_KEYWORDS) {
            if (containsKeyword(upperSql, keyword)) {
                throw new IllegalArgumentException("Faqat o'qish uchun SELECT query ishlaydi");
            }
        }
    }

    private boolean containsKeyword(String sql, String keyword) {
        return sql.matches("(?s).*(^|\\W)" + keyword + "($|\\W).*");
    }

    private String normalizeSql(String sql) {
        var normalized = trimToNull(sql);
        if (normalized == null) {
            throw new IllegalArgumentException("SQL query majburiy");
        }

        if (normalized.endsWith(";")) {
            normalized = normalized.substring(0, normalized.length() - 1).trim();
        }
        if (normalized.contains(";")) {
            throw new IllegalArgumentException("Faqat bitta SQL query yuborish mumkin");
        }

        return normalized;
    }

    private String normalizeServerName(String serverName) {
        var normalized = trimToNull(serverName);
        if (normalized == null) {
            throw new IllegalArgumentException("Server nomi majburiy");
        }

        return normalized;
    }

    private String resolveActor(Authentication authentication) {
        return securityActorResolver.resolveActorId(authentication, "anonymous");
    }

    private String extractSqlErrorMessage(SQLException exception) {
        var normalizedMessage = trimToNull(exception.getMessage());
        if (normalizedMessage != null) {
            return normalizedMessage;
        }

        var sqlState = trimToNull(exception.getSQLState());
        if (sqlState != null) {
            return "SQLSTATE: " + sqlState;
        }

        return "SQL query bajarilmadi";
    }

    private String stringifyValue(Object value) throws SQLException {
        if (value == null) {
            return null;
        }

        if (value instanceof byte[]) {
            return "[binary]";
        }
        if (value instanceof Blob blob) {
            return "[blob:" + blob.length() + "]";
        }
        if (value instanceof Clob clob) {
            var length = (int) Math.min(clob.length(), 4_000L);
            return clob.getSubString(1, length);
        }
        if (value instanceof SQLXML sqlxml) {
            return sqlxml.getString();
        }

        return String.valueOf(value);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        var normalized = value.trim();
        return normalized.isBlank() ? null : normalized;
    }

    private static final class QueryExecutionHandle {

        private final Object monitor = new Object();
        private final UUID id;
        private final String actor;
        private final String serverName;
        private final String sql;
        private final Instant createdAt = Instant.now();
        private final AtomicBoolean cancellationRequested = new AtomicBoolean(false);
        private volatile SqlRunnerDtos.QueryExecutionStatus status = SqlRunnerDtos.QueryExecutionStatus.QUEUED;
        private volatile String logMessage = "Query navbatga qo'yildi";
        private volatile String errorMessage;
        private volatile Instant startedAt;
        private volatile Instant finishedAt;
        private volatile SqlRunnerDtos.QueryExecutionResult result;
        private volatile Statement statement;
        private volatile Future<?> future;

        private QueryExecutionHandle(UUID id, String actor, String serverName, String sql) {
            this.id = id;
            this.actor = actor;
            this.serverName = serverName;
            this.sql = sql;
        }

        private UUID id() {
            return id;
        }

        private String serverName() {
            return serverName;
        }

        private String sql() {
            return sql;
        }

        private SqlRunnerDtos.QueryExecutionStatus status() {
            return status;
        }

        private String logMessage() {
            return logMessage;
        }

        private String errorMessage() {
            return errorMessage;
        }

        private Instant createdAt() {
            return createdAt;
        }

        private Instant startedAt() {
            return startedAt;
        }

        private Instant finishedAt() {
            return finishedAt;
        }

        private SqlRunnerDtos.QueryExecutionResult result() {
            return result;
        }

        private boolean belongsTo(String actor) {
            return this.actor.equals(actor);
        }

        private boolean isStopAvailable() {
            return status == SqlRunnerDtos.QueryExecutionStatus.QUEUED || status == SqlRunnerDtos.QueryExecutionStatus.RUNNING;
        }

        private boolean isCancellationRequested() {
            return cancellationRequested.get();
        }

        private void attachFuture(Future<?> future) {
            synchronized (monitor) {
                this.future = future;
                if (cancellationRequested.get()) {
                    future.cancel(true);
                }
            }
        }

        private void attachStatement(Statement statement) {
            synchronized (monitor) {
                this.statement = statement;
                if (cancellationRequested.get()) {
                    try {
                        statement.cancel();
                    } catch (SQLException ignored) {
                        // Ignore cancellation edge cases.
                    }
                }
            }
        }

        private void detachStatement() {
            synchronized (monitor) {
                statement = null;
            }
        }

        private void markRunning() {
            if (cancellationRequested.get()) {
                markCancelled("Query foydalanuvchi tomonidan to'xtatildi");
                return;
            }

            status = SqlRunnerDtos.QueryExecutionStatus.RUNNING;
            startedAt = Instant.now();
            logMessage = "Query bajarilmoqda";
            errorMessage = null;
            result = null;
        }

        private void markCompleted(SqlRunnerDtos.QueryExecutionResult result, String logMessage) {
            if (cancellationRequested.get()) {
                markCancelled("Query foydalanuvchi tomonidan to'xtatildi");
                return;
            }

            status = SqlRunnerDtos.QueryExecutionStatus.COMPLETED;
            this.result = result;
            this.logMessage = logMessage;
            errorMessage = null;
            finishedAt = Instant.now();
        }

        private void markFailed(String errorMessage) {
            if (cancellationRequested.get()) {
                markCancelled("Query foydalanuvchi tomonidan to'xtatildi");
                return;
            }

            status = SqlRunnerDtos.QueryExecutionStatus.FAILED;
            result = null;
            this.errorMessage = errorMessage;
            logMessage = "SQL query bajarilmadi";
            finishedAt = Instant.now();
        }

        private void markCancelled(String logMessage) {
            status = SqlRunnerDtos.QueryExecutionStatus.CANCELLED;
            result = null;
            errorMessage = null;
            this.logMessage = logMessage;
            if (startedAt == null) {
                startedAt = createdAt;
            }
            finishedAt = Instant.now();
        }

        private void cancel() {
            cancellationRequested.set(true);

            synchronized (monitor) {
                if (status == SqlRunnerDtos.QueryExecutionStatus.COMPLETED
                    || status == SqlRunnerDtos.QueryExecutionStatus.FAILED
                    || status == SqlRunnerDtos.QueryExecutionStatus.CANCELLED) {
                    return;
                }

                if (statement != null) {
                    try {
                        statement.cancel();
                    } catch (SQLException ignored) {
                        // Ignore cancellation edge cases.
                    }
                }

                if (future != null) {
                    future.cancel(true);
                }

                if (status == SqlRunnerDtos.QueryExecutionStatus.QUEUED) {
                    markCancelled("Query foydalanuvchi tomonidan to'xtatildi");
                } else {
                    logMessage = "Query to'xtatilmoqda";
                }
            }
        }

        private boolean isExpired(Instant threshold) {
            return finishedAt != null && finishedAt.isBefore(threshold);
        }
    }
}
