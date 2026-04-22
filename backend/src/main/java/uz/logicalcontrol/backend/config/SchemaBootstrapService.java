package uz.logicalcontrol.backend.config;

import jakarta.annotation.PostConstruct;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SchemaBootstrapService {

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void ensureSchemaObjects() {
        ensureTableExists(
            "logical_control_number_sequences",
            """
                create table logical_control_number_sequences (
                    sequence_year integer not null primary key,
                    last_value integer not null
                )
                """
        );
        ensureTableExists(
            "entity_column_metadata",
            """
                create table entity_column_metadata (
                    entity_name varchar(255) ccsid 1208 not null,
                    entity_name_definition varchar(500) ccsid 1208,
                    column_name varchar(255) ccsid 1208 not null,
                    column_name_definition varchar(500) ccsid 1208,
                    column_type varchar(255) ccsid 1208,
                    column_length varchar(120) ccsid 1208
                )
                """
        );
        ensureTableExists(
            "biz_tables",
            """
                create table biz_tables (
                    id char(36) not null primary key,
                    table_name varchar(255) ccsid 1208 not null,
                    entity_name_definition varchar(500) ccsid 1208,
                    description varchar(2000) ccsid 1208,
                    system_type varchar(160) ccsid 1208,
                    created_at timestamp not null default current timestamp,
                    updated_at timestamp not null default current timestamp
                )
                """
        );
        ensureTableExists(
            "biz_table_columns",
            """
                create table biz_table_columns (
                    id char(36) not null primary key,
                    classifier_table_id char(36) not null,
                    column_name varchar(255) ccsid 1208 not null,
                    column_name_definition varchar(500) ccsid 1208,
                    column_type varchar(255) ccsid 1208,
                    column_length varchar(120) ccsid 1208,
                    data_type varchar(255) ccsid 1208,
                    column_description varchar(2000) ccsid 1208,
                    nullable smallint,
                    ordinal_position integer,
                    created_at timestamp not null default current timestamp,
                    updated_at timestamp not null default current timestamp,
                    constraint fk_biz_table_columns_table
                        foreign key (classifier_table_id) references biz_tables(id)
                        on delete cascade
                )
                """
        );

        ensureIndexExists(
            "idx_biz_table_columns_table_order",
            "biz_table_columns",
            "create index idx_biz_table_columns_table_order on biz_table_columns (classifier_table_id, ordinal_position)"
        );
    }

    private void ensureTableExists(String tableName, String ddl) {
        var exists = jdbcTemplate.execute((ConnectionCallback<Boolean>) connection -> tableExists(connection, tableName));
        if (Boolean.TRUE.equals(exists)) {
            return;
        }

        jdbcTemplate.execute(ddl);
    }

    private void ensureIndexExists(String indexName, String tableName, String ddl) {
        var exists = jdbcTemplate.execute((ConnectionCallback<Boolean>) connection -> indexExists(connection, tableName, indexName));
        if (Boolean.TRUE.equals(exists)) {
            return;
        }

        jdbcTemplate.execute(ddl);
    }

    private boolean tableExists(Connection connection, String tableName) throws SQLException {
        var metadata = connection.getMetaData();
        for (var schemaPattern : resolveSchemaPatterns(connection)) {
            for (var tablePattern : resolveIdentifierPatterns(tableName)) {
                try (ResultSet resultSet = metadata.getTables(null, schemaPattern, tablePattern, new String[] {"TABLE"})) {
                    if (resultSet.next()) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    private boolean indexExists(Connection connection, String tableName, String indexName) throws SQLException {
        var metadata = connection.getMetaData();
        for (var schemaPattern : resolveSchemaPatterns(connection)) {
            for (var tablePattern : resolveIdentifierPatterns(tableName)) {
                try (ResultSet resultSet = metadata.getIndexInfo(null, schemaPattern, tablePattern, false, false)) {
                    while (resultSet.next()) {
                        var currentIndexName = resultSet.getString("INDEX_NAME");
                        if (currentIndexName != null && currentIndexName.equalsIgnoreCase(indexName)) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    private List<String> resolveSchemaPatterns(Connection connection) throws SQLException {
        var patterns = new ArrayList<String>();
        addPattern(patterns, connection.getSchema());
        addPattern(patterns, connection.getMetaData().getUserName());
        if (!patterns.contains(null)) {
            patterns.add(null);
        }
        return patterns;
    }

    private List<String> resolveIdentifierPatterns(String identifier) {
        var patterns = new ArrayList<String>();
        addPattern(patterns, identifier);
        return patterns;
    }

    private void addPattern(List<String> patterns, String candidate) {
        if (candidate == null) {
            return;
        }

        var normalized = candidate.trim();
        if (normalized.isEmpty()) {
            return;
        }

        if (!patterns.contains(normalized)) {
            patterns.add(normalized);
        }

        var upperCase = normalized.toUpperCase(java.util.Locale.ROOT);
        if (!patterns.contains(upperCase)) {
            patterns.add(upperCase);
        }
    }
}
