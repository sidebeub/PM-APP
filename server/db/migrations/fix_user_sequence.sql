-- Fix user ID sequence issue
-- This happens when data is imported without updating the sequence

-- Reset the users sequence to the correct value
SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users));

-- Also fix other sequences that might have the same issue
SELECT setval('projects_id_seq', (SELECT COALESCE(MAX(id), 1) FROM projects));
SELECT setval('tasks_id_seq', (SELECT COALESCE(MAX(id), 1) FROM tasks));
SELECT setval('customers_id_seq', (SELECT COALESCE(MAX(id), 1) FROM customers));

-- Verify the sequences are correct
SELECT 'users_id_seq' as sequence_name, last_value FROM users_id_seq
UNION ALL
SELECT 'projects_id_seq' as sequence_name, last_value FROM projects_id_seq
UNION ALL
SELECT 'tasks_id_seq' as sequence_name, last_value FROM tasks_id_seq
UNION ALL
SELECT 'customers_id_seq' as sequence_name, last_value FROM customers_id_seq;
