FROM postgres:16-alpine

COPY initial_schema.sql /docker-entrypoint-initdb.d/001_initial_schema.sql
COPY test_data.sql /docker-entrypoint-initdb.d/002_test_data.sql
