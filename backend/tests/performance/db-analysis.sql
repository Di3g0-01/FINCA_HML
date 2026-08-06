-- 1. Análisis de la consulta principal de búsqueda
EXPLAIN ANALYZE 
SELECT "Animal"."id" AS "Animal_id", 
       "Animal"."identifier" AS "Animal_identifier", 
       "Animal"."name" AS "Animal_name", 
       "Animal"."status" AS "Animal_status", 
       "Animal"."type" AS "Animal_type", 
       "Animal"."birth_date" AS "Animal_birth_date"
FROM "animals" "Animal" 
WHERE "Animal"."status" = 'ACTIVO'
ORDER BY 
    CAST(REGEXP_REPLACE("Animal"."identifier", '[^0-9]', '', 'g') AS INTEGER) ASC
LIMIT 20;

-- 2. Estadísticas de los índices actuales
SELECT
    tablename,
    indexname,
    indexdef
FROM
    pg_indexes
WHERE
    schemaname = 'public'
ORDER BY
    tablename,
    indexname;

-- 3. Cache Hit Ratio (Rendimiento general de PostgreSQL)
SELECT 
  sum(heap_blks_read) as heap_read,
  sum(heap_blks_hit)  as heap_hit,
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio
FROM 
  pg_statio_user_tables;
