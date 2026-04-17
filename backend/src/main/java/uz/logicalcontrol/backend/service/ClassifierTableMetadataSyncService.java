package uz.logicalcontrol.backend.service;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import jakarta.annotation.PreDestroy;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.logicalcontrol.backend.config.ClassifierCacheConfiguration;
import uz.logicalcontrol.backend.config.ClassifierTableSyncProperties;
import uz.logicalcontrol.backend.config.SqlQueryRunnerProperties;

@Service
public class ClassifierTableMetadataSyncService {

    private static final String CLASSIFIER_TABLES_NAME = "classifier_tables";
    private static final String CLASSIFIER_TABLE_COLUMNS_NAME = "classifier_table_columns";
    private static final String SYSTEM_TYPE_RW = "Temir yo'l (RW)";
    private static final String SYSTEM_TYPE_MB = "Yuksiz yoki yengil transport (MB)";
    private static final String SYSTEM_TYPE_EK = "Eksport uch qadam (EK)";
    private static final String SYSTEM_TYPE_AT = "Yukli avtotransport (AT)";
    private static final String SYSTEM_TYPE_EC = "Kommersiya (EC)";

    private final JdbcTemplate jdbcTemplate;
    private final SqlQueryRunnerProperties sqlQueryRunnerProperties;
    private final ClassifierTableSyncProperties classifierTableSyncProperties;
    private volatile HikariDataSource etranzitMetadataDataSource;

    public ClassifierTableMetadataSyncService(
        JdbcTemplate jdbcTemplate,
        SqlQueryRunnerProperties sqlQueryRunnerProperties,
        ClassifierTableSyncProperties classifierTableSyncProperties
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.sqlQueryRunnerProperties = sqlQueryRunnerProperties;
        this.classifierTableSyncProperties = classifierTableSyncProperties;
    }

    @Transactional
    @CacheEvict(cacheNames = ClassifierCacheConfiguration.TABLES_CACHE, allEntries = true)
    public SyncSummary syncMetadataFromEtranzit() {
        if (!classifierTableMetadataTablesExist()) {
            return new SyncSummary(0, 0, 0, 0, 0, 0);
        }

        var remoteTables = loadRemoteTables();
        if (remoteTables.isEmpty()) {
            return new SyncSummary(0, 0, 0, 0, 0, 0);
        }

        var existingTablesByName = loadExistingTablesByName();
        var summary = new MutableSyncSummary();
        var schemaName = classifierTableSyncProperties.getSchemaName().trim().toLowerCase(Locale.ROOT);

        for (var remoteTable : remoteTables) {
            var existingTable = existingTablesByName.remove(remoteTable.tableName());
            var tableId = existingTable == null ? UUID.randomUUID() : existingTable.id();
            var entityNameDefinition = firstNonBlank(
                existingTable == null ? null : existingTable.entityNameDefinition(),
                remoteTable.entityNameDefinition(schemaName)
            );
            var systemType = firstNonBlank(
                existingTable == null ? null : existingTable.systemType(),
                deriveSystemType(remoteTable.tableName(), entityNameDefinition)
            );
            var description = firstNonBlank(
                existingTable == null ? null : existingTable.description(),
                remoteTable.remarks(),
                buildTableDescription(remoteTable.tableName(), entityNameDefinition, systemType)
            );

            upsertTable(tableId, remoteTable.tableName(), entityNameDefinition, description, systemType, existingTable == null);
            if (existingTable == null) {
                summary.insertedTables += 1;
            } else {
                summary.updatedTables += 1;
            }

            summary.processedTables += 1;
            syncColumns(tableId, existingTable, remoteTable.columns(), summary);
        }

        for (var staleTable : existingTablesByName.values()) {
            deleteTable(staleTable.id());
            summary.deletedTables += 1;
            summary.deletedColumns += staleTable.columnsByName().size();
        }

        return summary.toImmutable();
    }

    @PreDestroy
    public void shutdown() {
        var dataSource = etranzitMetadataDataSource;
        if (dataSource != null && !dataSource.isClosed()) {
            dataSource.close();
        }
    }

    private List<RemoteTable> loadRemoteTables() {
        var schemaName = classifierTableSyncProperties.getSchemaName().trim().toUpperCase(Locale.ROOT);
        try (Connection connection = getOrCreateDataSource().getConnection()) {
            var metadata = connection.getMetaData();
            var tables = new LinkedHashMap<String, RemoteTableAccumulator>();

            try (ResultSet tableResultSet = metadata.getTables(null, schemaName, "%", new String[] {"TABLE"})) {
                while (tableResultSet.next()) {
                    var tableName = normalizeIdentifier(tableResultSet.getString("TABLE_NAME"));
                    if (tableName == null) {
                        continue;
                    }

                    tables.put(
                        tableName,
                        new RemoteTableAccumulator(
                            tableName,
                            trimToNull(tableResultSet.getString("REMARKS"))
                        )
                    );
                }
            }

            if (tables.isEmpty()) {
                return List.of();
            }

            try (ResultSet columnResultSet = metadata.getColumns(null, schemaName, "%", "%")) {
                while (columnResultSet.next()) {
                    var tableName = normalizeIdentifier(columnResultSet.getString("TABLE_NAME"));
                    var accumulator = tableName == null ? null : tables.get(tableName);
                    if (accumulator == null) {
                        continue;
                    }

                    accumulator.addColumn(new RemoteColumn(
                        normalizeIdentifier(columnResultSet.getString("COLUMN_NAME")),
                        trimToNull(columnResultSet.getString("TYPE_NAME")),
                        toNullableInteger(columnResultSet, "COLUMN_SIZE"),
                        toNullableInteger(columnResultSet, "DECIMAL_DIGITS"),
                        resolveNullable(columnResultSet),
                        toNullableInteger(columnResultSet, "ORDINAL_POSITION"),
                        trimToNull(columnResultSet.getString("REMARKS"))
                    ));
                }
            }

            return tables.values().stream()
                .map(RemoteTableAccumulator::toRemoteTable)
                .toList();
        } catch (SQLException exception) {
            throw new IllegalStateException("ETRANZIT metadata o'qib bo'lmadi", exception);
        }
    }

    private Map<String, ExistingTable> loadExistingTablesByName() {
        var tables = new LinkedHashMap<UUID, ExistingTableAccumulator>();

        jdbcTemplate.query(
            """
                select
                    t.id as table_id,
                    t.table_name,
                    t.entity_name_definition,
                    t.description,
                    t.system_type,
                    c.id as column_id,
                    c.column_name,
                    c.column_name_definition,
                    c.column_description
                from classifier_tables t
                left join classifier_table_columns c
                    on c.classifier_table_id = t.id
                order by lower(t.table_name), c.ordinal_position nulls last, lower(c.column_name)
            """,
            resultSet -> {
                var tableId = UUID.fromString(resultSet.getString("table_id"));
                var accumulator = tables.get(tableId);
                if (accumulator == null) {
                    accumulator = new ExistingTableAccumulator(
                        tableId,
                        normalizeIdentifier(resultSet.getString("table_name")),
                        trimToNull(resultSet.getString("entity_name_definition")),
                        trimToNull(resultSet.getString("description")),
                        trimToNull(resultSet.getString("system_type"))
                    );
                    tables.put(tableId, accumulator);
                }

                var columnIdValue = resultSet.getString("column_id");
                if (columnIdValue != null) {
                    accumulator.addColumn(new ExistingColumn(
                        UUID.fromString(columnIdValue),
                        normalizeIdentifier(resultSet.getString("column_name")),
                        trimToNull(resultSet.getString("column_name_definition")),
                        trimToNull(resultSet.getString("column_description"))
                    ));
                }
            }
        );

        var result = new LinkedHashMap<String, ExistingTable>();
        for (var table : tables.values()) {
            var existingTable = table.toExistingTable();
            result.put(existingTable.tableName(), existingTable);
        }
        return result;
    }

    private void syncColumns(
        UUID tableId,
        ExistingTable existingTable,
        List<RemoteColumn> remoteColumns,
        MutableSyncSummary summary
    ) {
        var existingColumnsByName = existingTable == null
            ? new LinkedHashMap<String, ExistingColumn>()
            : new LinkedHashMap<>(existingTable.columnsByName());

        var ordinalPosition = 1;
        for (var remoteColumn : remoteColumns) {
            if (remoteColumn.columnName() == null) {
                continue;
            }

            var existingColumn = existingColumnsByName.remove(remoteColumn.columnName());
            var columnId = existingColumn == null ? UUID.randomUUID() : existingColumn.id();
            var columnType = trimToNull(remoteColumn.typeName());
            var columnLength = formatColumnLength(remoteColumn.columnSize(), remoteColumn.decimalDigits());
            var dataType = buildColumnDataType(columnType, columnLength);
            var columnNameDefinition = firstNonBlank(
                existingColumn == null ? null : existingColumn.columnNameDefinition(),
                remoteColumn.columnName()
            );
            var columnDescription = firstNonBlank(
                existingColumn == null ? null : existingColumn.columnDescription(),
                remoteColumn.remarks()
            );
            var normalizedOrdinalPosition = remoteColumn.ordinalPosition() == null || remoteColumn.ordinalPosition() <= 0
                ? ordinalPosition
                : remoteColumn.ordinalPosition();

            upsertColumn(
                columnId,
                tableId,
                remoteColumn.columnName(),
                columnNameDefinition,
                columnType,
                columnLength,
                dataType,
                columnDescription,
                remoteColumn.nullable(),
                normalizedOrdinalPosition,
                existingColumn == null
            );

            if (existingColumn == null) {
                summary.insertedColumns += 1;
            } else {
                summary.updatedColumns += 1;
            }

            ordinalPosition = normalizedOrdinalPosition + 1;
        }

        for (var staleColumn : existingColumnsByName.values()) {
            deleteColumn(staleColumn.id());
            summary.deletedColumns += 1;
        }
    }

    private void upsertTable(
        UUID tableId,
        String tableName,
        String entityNameDefinition,
        String description,
        String systemType,
        boolean insert
    ) {
        if (insert) {
            jdbcTemplate.update(
                """
                    insert into classifier_tables (
                        id,
                        table_name,
                        entity_name_definition,
                        description,
                        system_type
                    ) values (?, ?, ?, ?, ?)
                    """,
                tableId,
                tableName,
                entityNameDefinition,
                description,
                systemType
            );
            return;
        }

        jdbcTemplate.update(
            """
                update classifier_tables
                set table_name = ?,
                    entity_name_definition = ?,
                    description = ?,
                    system_type = ?,
                    updated_at = now()
                where id = ?
                """,
            tableName,
            entityNameDefinition,
            description,
            systemType,
            tableId
        );
    }

    private void upsertColumn(
        UUID columnId,
        UUID tableId,
        String columnName,
        String columnNameDefinition,
        String columnType,
        String columnLength,
        String dataType,
        String columnDescription,
        Boolean nullable,
        int ordinalPosition,
        boolean insert
    ) {
        if (insert) {
            jdbcTemplate.update(
                """
                    insert into classifier_table_columns (
                        id,
                        classifier_table_id,
                        column_name,
                        column_name_definition,
                        column_type,
                        column_length,
                        data_type,
                        column_description,
                        nullable,
                        ordinal_position
                    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                columnId,
                tableId,
                columnName,
                columnNameDefinition,
                columnType,
                columnLength,
                dataType,
                columnDescription,
                nullable,
                ordinalPosition
            );
            return;
        }

        jdbcTemplate.update(
            """
                update classifier_table_columns
                set column_name = ?,
                    column_name_definition = ?,
                    column_type = ?,
                    column_length = ?,
                    data_type = ?,
                    column_description = ?,
                    nullable = ?,
                    ordinal_position = ?,
                    updated_at = now()
                where id = ?
                """,
            columnName,
            columnNameDefinition,
            columnType,
            columnLength,
            dataType,
            columnDescription,
            nullable,
            ordinalPosition,
            columnId
        );
    }

    private void deleteColumn(UUID columnId) {
        jdbcTemplate.update("delete from classifier_table_columns where id = ?", columnId);
    }

    private void deleteTable(UUID tableId) {
        jdbcTemplate.update("delete from classifier_tables where id = ?", tableId);
    }

    private boolean classifierTableMetadataTablesExist() {
        return tableExists(CLASSIFIER_TABLES_NAME) && tableExists(CLASSIFIER_TABLE_COLUMNS_NAME);
    }

    private boolean tableExists(String tableName) {
        var exists = jdbcTemplate.queryForObject(
            """
                select exists (
                    select 1
                    from information_schema.tables
                    where table_schema not in ('information_schema', 'pg_catalog')
                      and lower(table_name) = ?
                )
                """,
            Boolean.class,
            tableName
        );

        return Boolean.TRUE.equals(exists);
    }

    private HikariDataSource getOrCreateDataSource() {
        var current = etranzitMetadataDataSource;
        if (current != null && !current.isClosed()) {
            return current;
        }

        synchronized (this) {
            current = etranzitMetadataDataSource;
            if (current != null && !current.isClosed()) {
                return current;
            }

            var settings = sqlQueryRunnerProperties.getEtranzit();
            var hikariConfig = new HikariConfig();
            hikariConfig.setPoolName("etranzit-classifier-sync");
            hikariConfig.setDriverClassName(settings.getDriverClassName());
            hikariConfig.setJdbcUrl(settings.getJdbcUrl());
            hikariConfig.setUsername(settings.getUsername());
            hikariConfig.setPassword(settings.getPassword());
            hikariConfig.setAutoCommit(true);
            hikariConfig.setConnectionTimeout(30_000);
            hikariConfig.setValidationTimeout(5_000);
            hikariConfig.setMinimumIdle(0);
            hikariConfig.setMaximumPoolSize(2);
            hikariConfig.setIdleTimeout(300_000);
            hikariConfig.setMaxLifetime(900_000);
            hikariConfig.setInitializationFailTimeout(-1);
            hikariConfig.setConnectionTestQuery("select current_timestamp cts from sysibm.sysdummy1");
            etranzitMetadataDataSource = new HikariDataSource(hikariConfig);
            return etranzitMetadataDataSource;
        }
    }

    private Integer toNullableInteger(ResultSet resultSet, String columnLabel) throws SQLException {
        var value = resultSet.getInt(columnLabel);
        return resultSet.wasNull() ? null : value;
    }

    private Boolean resolveNullable(ResultSet resultSet) throws SQLException {
        var nullableCode = resultSet.getInt("NULLABLE");
        if (resultSet.wasNull()) {
            return null;
        }

        if (nullableCode == DatabaseMetaData.columnNullable) {
            return Boolean.TRUE;
        }

        if (nullableCode == DatabaseMetaData.columnNoNulls) {
            return Boolean.FALSE;
        }

        return null;
    }

    private String formatColumnLength(Integer columnSize, Integer decimalDigits) {
        if (columnSize == null || columnSize <= 0) {
            return null;
        }

        if (decimalDigits != null && decimalDigits > 0) {
            return columnSize + "," + decimalDigits;
        }

        return String.valueOf(columnSize);
    }

    private String buildColumnDataType(String columnType, String columnLength) {
        if (columnType == null) {
            return columnLength == null ? "UNKNOWN" : columnLength;
        }

        return columnLength == null ? columnType : columnType + "(" + columnLength + ")";
    }

    private String deriveSystemType(String entityName, String entityDefinition) {
        var normalizedEntityName = entityName == null ? "" : entityName.toUpperCase(Locale.ROOT);
        var normalizedEntityDefinition = entityDefinition == null ? "" : entityDefinition.toLowerCase(Locale.ROOT);
        var simpleClassName = extractSimpleClassName(entityDefinition).toUpperCase(Locale.ROOT);

        if (normalizedEntityName.contains("_RW")
            || normalizedEntityName.startsWith("RAILWAY")
            || normalizedEntityName.endsWith("RW")
            || simpleClassName.endsWith("RW")) {
            return SYSTEM_TYPE_RW;
        }

        if (normalizedEntityName.contains("MOBILE")
            || normalizedEntityName.contains("_MB")
            || normalizedEntityName.endsWith("MB")
            || normalizedEntityDefinition.contains(".mb.")
            || simpleClassName.contains("MOBILE")) {
            return SYSTEM_TYPE_MB;
        }

        if (normalizedEntityName.contains("_CM")
            || normalizedEntityName.contains("COMMERCE")
            || normalizedEntityName.startsWith("CM")
            || normalizedEntityName.endsWith("EC")
            || normalizedEntityDefinition.contains(".commerce.")
            || normalizedEntityDefinition.contains(".cm.")
            || simpleClassName.contains("COMMERCE")
            || simpleClassName.startsWith("CM")) {
            return SYSTEM_TYPE_EC;
        }

        if (normalizedEntityDefinition.contains(".eksport.")
            || normalizedEntityName.contains("_EK")
            || normalizedEntityName.endsWith("EK")
            || normalizedEntityName.endsWith("EKA")
            || normalizedEntityName.endsWith("EKV")
            || simpleClassName.endsWith("EK")
            || simpleClassName.endsWith("EKA")
            || simpleClassName.endsWith("EKV")) {
            return SYSTEM_TYPE_EK;
        }

        return SYSTEM_TYPE_AT;
    }

    private String buildTableDescription(String entityName, String entityDefinition, String systemType) {
        var displayName = humanizeIdentifier(extractSimpleClassName(entityDefinition));
        if (displayName == null) {
            displayName = humanizeIdentifier(entityName);
        }

        if (displayName == null) {
            return systemType + " tizimiga oid jadval";
        }

        return systemType + " tizimiga oid " + displayName + " jadvali";
    }

    private String extractSimpleClassName(String entityDefinition) {
        var normalized = trimToNull(entityDefinition);
        if (normalized == null) {
            return "";
        }

        var separatorIndex = normalized.lastIndexOf('.');
        return separatorIndex >= 0 ? normalized.substring(separatorIndex + 1) : normalized;
    }

    private String humanizeIdentifier(String value) {
        var normalized = trimToNull(value);
        if (normalized == null) {
            return null;
        }

        return normalized
            .replaceAll("([a-z0-9])([A-Z])", "$1 $2")
            .replace('_', ' ')
            .replace('.', ' ')
            .trim();
    }

    private String normalizeIdentifier(String value) {
        var normalized = trimToNull(value);
        return normalized == null ? null : normalized.toLowerCase(Locale.ROOT);
    }

    private String firstNonBlank(String... values) {
        for (var value : values) {
            var normalized = trimToNull(value);
            if (normalized != null) {
                return normalized;
            }
        }

        return null;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        var normalized = value.trim();
        return normalized.isBlank() ? null : normalized;
    }

    public record SyncSummary(
        int processedTables,
        int insertedTables,
        int updatedTables,
        int deletedTables,
        int insertedColumns,
        int updatedColumns,
        int deletedColumns
    ) {
        public SyncSummary(int processedTables, int insertedTables, int updatedTables, int deletedTables, int insertedColumns, int updatedColumns) {
            this(processedTables, insertedTables, updatedTables, deletedTables, insertedColumns, updatedColumns, 0);
        }
    }

    private static final class MutableSyncSummary {

        private int processedTables;
        private int insertedTables;
        private int updatedTables;
        private int deletedTables;
        private int insertedColumns;
        private int updatedColumns;
        private int deletedColumns;

        private SyncSummary toImmutable() {
            return new SyncSummary(
                processedTables,
                insertedTables,
                updatedTables,
                deletedTables,
                insertedColumns,
                updatedColumns,
                deletedColumns
            );
        }
    }

    private record ExistingTable(
        UUID id,
        String tableName,
        String entityNameDefinition,
        String description,
        String systemType,
        Map<String, ExistingColumn> columnsByName
    ) {
    }

    private record ExistingColumn(
        UUID id,
        String columnName,
        String columnNameDefinition,
        String columnDescription
    ) {
    }

    private static final class ExistingTableAccumulator {

        private final UUID id;
        private final String tableName;
        private final String entityNameDefinition;
        private final String description;
        private final String systemType;
        private final Map<String, ExistingColumn> columnsByName = new LinkedHashMap<>();

        private ExistingTableAccumulator(
            UUID id,
            String tableName,
            String entityNameDefinition,
            String description,
            String systemType
        ) {
            this.id = id;
            this.tableName = tableName;
            this.entityNameDefinition = entityNameDefinition;
            this.description = description;
            this.systemType = systemType;
        }

        private void addColumn(ExistingColumn column) {
            if (column.columnName() == null) {
                return;
            }

            columnsByName.put(column.columnName(), column);
        }

        private ExistingTable toExistingTable() {
            return new ExistingTable(id, tableName, entityNameDefinition, description, systemType, Map.copyOf(columnsByName));
        }
    }

    private record RemoteTable(
        String tableName,
        String remarks,
        List<RemoteColumn> columns
    ) {
        private String entityNameDefinition(String schemaName) {
            return schemaName + "." + tableName;
        }
    }

    private record RemoteColumn(
        String columnName,
        String typeName,
        Integer columnSize,
        Integer decimalDigits,
        Boolean nullable,
        Integer ordinalPosition,
        String remarks
    ) {
    }

    private static final class RemoteTableAccumulator {

        private final String tableName;
        private final String remarks;
        private final Map<String, RemoteColumn> columnsByName = new LinkedHashMap<>();

        private RemoteTableAccumulator(String tableName, String remarks) {
            this.tableName = tableName;
            this.remarks = remarks;
        }

        private void addColumn(RemoteColumn column) {
            if (column.columnName() == null || columnsByName.containsKey(column.columnName())) {
                return;
            }

            columnsByName.put(column.columnName(), column);
        }

        private RemoteTable toRemoteTable() {
            return new RemoteTable(tableName, remarks, List.copyOf(columnsByName.values()));
        }
    }
}
