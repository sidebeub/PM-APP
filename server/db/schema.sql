-- Database schema for Enhanced Project Management App

-- Drop tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS task_dependencies CASCADE;
DROP TABLE IF EXISTS department_milestones CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS dependencies CASCADE; -- Drop any existing dependencies table

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'project_manager', 'team_member', 'viewer')),
    department VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create customers table
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    logo VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create projects table
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    project_number VARCHAR(20) NOT NULL UNIQUE,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Cancelled', 'On Hold')),
    start_date DATE,
    expected_completion_date DATE,
    actual_completion_date DATE,
    shipping_date DATE,
    order_date DATE,
    total_budget DECIMAL(12, 2),
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    notes TEXT,
    project_manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    project_type VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Delayed', 'Blocked')),
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    department VARCHAR(50),
    start_date DATE,
    due_date DATE,
    completed_date DATE,
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create task dependencies table
CREATE TABLE task_dependencies (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT task_dependency_unique UNIQUE (task_id, depends_on_task_id),
    CONSTRAINT task_not_self_dependent CHECK (task_id != depends_on_task_id)
);

-- Create department milestones table
CREATE TABLE department_milestones (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    department VARCHAR(50) NOT NULL,
    milestone_name VARCHAR(100) NOT NULL,
    planned_date DATE,
    actual_date DATE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Delayed')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_projects_customer_id ON projects(customer_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_task_dependencies_task_id ON task_dependencies(task_id);
CREATE INDEX idx_task_dependencies_depends_on_task_id ON task_dependencies(depends_on_task_id);
CREATE INDEX idx_department_milestones_project_id ON department_milestones(project_id);

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update timestamp
CREATE TRIGGER update_users_timestamp BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_customers_timestamp BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_projects_timestamp BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_tasks_timestamp BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_department_milestones_timestamp BEFORE UPDATE ON department_milestones FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Insert sample data for testing

-- Sample users
INSERT INTO users (username, email, password_hash, role, department) VALUES
('john.manager', 'john.manager@example.com', 'password_hash', 'admin', 'Management'),
('sarah.manager', 'sarah.manager@example.com', 'password_hash', 'project_manager', 'Management'),
('jane.smith', 'jane.smith@example.com', 'password_hash', 'team_member', 'Engineering'),
('robert.johnson', 'robert.johnson@example.com', 'password_hash', 'team_member', 'Purchasing'),
('michael.brown', 'michael.brown@example.com', 'password_hash', 'team_member', 'Programming');

-- Sample customers
INSERT INTO customers (name, contact_person, email, phone, logo) VALUES
('Acme Corporation', 'John Doe', 'john.doe@acme.com', '555-123-4567', 'https://via.placeholder.com/50'),
('Globex Industries', 'Jane Smith', 'jane.smith@globex.com', '555-987-6543', 'https://via.placeholder.com/50');

-- Sample projects
INSERT INTO projects (project_number, customer_id, status, start_date, expected_completion_date, progress, notes, project_manager_id) VALUES
('PRJ-001', 1, 'In Progress', '2025-01-15', '2025-06-30', 35, 'Manufacturing equipment upgrade project', 1),
('PRJ-002', 2, 'Pending', '2025-04-01', '2025-08-15', 0, 'New production line installation', 2);

-- Sample tasks
INSERT INTO tasks (project_id, title, description, assignee_id, status, priority, department, start_date, due_date, progress) VALUES
(1, 'Design new conveyor system', 'Create detailed design specifications for the new conveyor system', 3, 'In Progress', 'High', 'Engineering', '2025-01-20', '2025-02-15', 60),
(1, 'Order components for assembly', 'Place orders for all required components based on the BOM', 4, 'Pending', 'Medium', 'Purchasing', '2025-02-01', '2025-02-10', 0),
(1, 'Develop control software', 'Write PLC code for the conveyor control system', 5, 'Blocked', 'Critical', 'Programming', '2025-02-15', '2025-03-15', 10);

-- Sample task dependencies
INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES
(2, 1),  -- "Order components" depends on "Design new conveyor system"
(3, 2);  -- "Develop control software" depends on "Order components"

-- Sample department milestones
INSERT INTO department_milestones (project_id, department, milestone_name, planned_date, status) VALUES
(1, 'Engineering', 'Design Approval', '2025-02-20', 'Pending'),
(1, 'Manufacturing', 'Production Start', '2025-03-15', 'Pending');
