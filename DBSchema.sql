--
-- PostgreSQL database dump
--

-- Dumped from database version 17.2
-- Dumped by pg_dump version 17.2

-- Started on 2025-05-01 12:35:48

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 231 (class 1255 OID 17938)
-- Name: update_timestamp(); Type: FUNCTION; Schema: public; Owner: Zach
--

CREATE FUNCTION public.update_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_timestamp() OWNER TO "Zach";

--
-- TOC entry 232 (class 1255 OID 17939)
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: Zach
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO "Zach";

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 222 (class 1259 OID 18281)
-- Name: customers; Type: TABLE; Schema: public; Owner: Zach
--

CREATE TABLE public.customers (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    contact_person character varying(100),
    email character varying(100),
    phone character varying(20),
    address text,
    logo text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.customers OWNER TO "Zach";

--
-- TOC entry 221 (class 1259 OID 18280)
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: Zach
--

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customers_id_seq OWNER TO "Zach";

--
-- TOC entry 4404 (class 0 OID 0)
-- Dependencies: 221
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: Zach
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- TOC entry 230 (class 1259 OID 18364)
-- Name: department_milestones; Type: TABLE; Schema: public; Owner: Zach
--

CREATE TABLE public.department_milestones (
    id integer NOT NULL,
    project_id integer NOT NULL,
    department character varying(50) NOT NULL,
    milestone_name character varying(100) NOT NULL,
    planned_date date,
    actual_date date,
    status character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT department_milestones_status_check CHECK (((status)::text = ANY ((ARRAY['Pending'::character varying, 'In Progress'::character varying, 'Completed'::character varying, 'Delayed'::character varying])::text[])))
);


ALTER TABLE public.department_milestones OWNER TO "Zach";

--
-- TOC entry 229 (class 1259 OID 18363)
-- Name: department_milestones_id_seq; Type: SEQUENCE; Schema: public; Owner: Zach
--

CREATE SEQUENCE public.department_milestones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.department_milestones_id_seq OWNER TO "Zach";

--
-- TOC entry 4405 (class 0 OID 0)
-- Dependencies: 229
-- Name: department_milestones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: Zach
--

ALTER SEQUENCE public.department_milestones_id_seq OWNED BY public.department_milestones.id;


--
-- TOC entry 217 (class 1259 OID 17955)
-- Name: milestones; Type: TABLE; Schema: public; Owner: Zach
--

CREATE TABLE public.milestones (
    id integer NOT NULL,
    project_id integer,
    name character varying(200) NOT NULL,
    description text,
    due_date date NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    priority character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.milestones OWNER TO "Zach";

--
-- TOC entry 218 (class 1259 OID 17964)
-- Name: milestones_id_seq; Type: SEQUENCE; Schema: public; Owner: Zach
--

CREATE SEQUENCE public.milestones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.milestones_id_seq OWNER TO "Zach";

--
-- TOC entry 4406 (class 0 OID 0)
-- Dependencies: 218
-- Name: milestones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: Zach
--

ALTER SEQUENCE public.milestones_id_seq OWNED BY public.milestones.id;


--
-- TOC entry 224 (class 1259 OID 18292)
-- Name: projects; Type: TABLE; Schema: public; Owner: Zach
--

CREATE TABLE public.projects (
    id integer NOT NULL,
    project_number character varying(20) NOT NULL,
    customer_id integer NOT NULL,
    status character varying(20) NOT NULL,
    start_date date,
    expected_completion_date date,
    actual_completion_date date,
    shipping_date date,
    order_date date,
    total_budget numeric(12,2),
    progress integer DEFAULT 0 NOT NULL,
    notes text,
    project_manager_id integer,
    project_type character varying(50),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT projects_progress_check CHECK (((progress >= 0) AND (progress <= 100))),
    CONSTRAINT projects_status_check CHECK (((status)::text = ANY ((ARRAY['Pending'::character varying, 'In Progress'::character varying, 'Completed'::character varying, 'Cancelled'::character varying, 'On Hold'::character varying])::text[])))
);


ALTER TABLE public.projects OWNER TO "Zach";

--
-- TOC entry 223 (class 1259 OID 18291)
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: Zach
--

CREATE SEQUENCE public.projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.projects_id_seq OWNER TO "Zach";

--
-- TOC entry 4407 (class 0 OID 0)
-- Dependencies: 223
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: Zach
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- TOC entry 228 (class 1259 OID 18343)
-- Name: task_dependencies; Type: TABLE; Schema: public; Owner: Zach
--

CREATE TABLE public.task_dependencies (
    id integer NOT NULL,
    task_id integer NOT NULL,
    depends_on_task_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT task_not_self_dependent CHECK ((task_id <> depends_on_task_id))
);


ALTER TABLE public.task_dependencies OWNER TO "Zach";

--
-- TOC entry 227 (class 1259 OID 18342)
-- Name: task_dependencies_id_seq; Type: SEQUENCE; Schema: public; Owner: Zach
--

CREATE SEQUENCE public.task_dependencies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.task_dependencies_id_seq OWNER TO "Zach";

--
-- TOC entry 4408 (class 0 OID 0)
-- Dependencies: 227
-- Name: task_dependencies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: Zach
--

ALTER SEQUENCE public.task_dependencies_id_seq OWNED BY public.task_dependencies.id;


--
-- TOC entry 226 (class 1259 OID 18318)
-- Name: tasks; Type: TABLE; Schema: public; Owner: Zach
--

CREATE TABLE public.tasks (
    id integer NOT NULL,
    project_id integer NOT NULL,
    title character varying(100) NOT NULL,
    description text,
    assignee_id integer,
    status character varying(20) NOT NULL,
    priority character varying(20) NOT NULL,
    department character varying(50),
    start_date date,
    due_date date,
    completed_date date,
    progress integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT tasks_priority_check CHECK (((priority)::text = ANY ((ARRAY['Low'::character varying, 'Medium'::character varying, 'High'::character varying, 'Critical'::character varying])::text[]))),
    CONSTRAINT tasks_progress_check CHECK (((progress >= 0) AND (progress <= 100))),
    CONSTRAINT tasks_status_check CHECK (((status)::text = ANY ((ARRAY['Pending'::character varying, 'In Progress'::character varying, 'Completed'::character varying, 'Delayed'::character varying, 'Blocked'::character varying])::text[])))
);


ALTER TABLE public.tasks OWNER TO "Zach";

--
-- TOC entry 225 (class 1259 OID 18317)
-- Name: tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: Zach
--

CREATE SEQUENCE public.tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tasks_id_seq OWNER TO "Zach";

--
-- TOC entry 4409 (class 0 OID 0)
-- Dependencies: 225
-- Name: tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: Zach
--

ALTER SEQUENCE public.tasks_id_seq OWNED BY public.tasks.id;


--
-- TOC entry 220 (class 1259 OID 18267)
-- Name: users; Type: TABLE; Schema: public; Owner: Zach
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(20) NOT NULL,
    department character varying(50),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'project_manager'::character varying, 'team_member'::character varying, 'viewer'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO "Zach";

--
-- TOC entry 219 (class 1259 OID 18266)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: Zach
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO "Zach";

--
-- TOC entry 4410 (class 0 OID 0)
-- Dependencies: 219
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: Zach
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 4187 (class 2604 OID 18284)
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: Zach
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- TOC entry 4200 (class 2604 OID 18367)
-- Name: department_milestones id; Type: DEFAULT; Schema: public; Owner: Zach
--

ALTER TABLE ONLY public.department_milestones ALTER COLUMN id SET DEFAULT nextval('public.department_milestones_id_seq'::regclass);


--
-- TOC entry 4179 (class 2604 OID 18212)
-- Name: milestones id; Type: DEFAULT; Schema: public; Owner: Zach
--

ALTER TABLE ONLY public.milestones ALTER COLUMN id SET DEFAULT nextval('public.milestones_id_seq'::regclass);


--
-- TOC entry 4190 (class 2604 OID 18295)
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: Zach
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- TOC entry 4198 (class 2604 OID 18346)
-- Name: task_dependencies id; Type: DEFAULT; Schema: public; Owner: Zach
--

ALTER TABLE ONLY public.task_dependencies ALTER COLUMN id SET DEFAULT nextval('public.task_dependencies_id_seq'::regclass);


--
-- TOC entry 4194 (class 2604 OID 18321)
-- Name: tasks id; Type: DEFAULT; Schema: public; Owner: Zach
--

ALTER TABLE ONLY public.tasks ALTER COLUMN id SET DEFAULT nextval('public.tasks_id_seq'::regclass);


--
-- TOC entry 4184 (class 2604 OID 18270)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: Zach
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 4221 (class 2606 OID 18290)
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: Zach
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- TOC entry 4238 (class 2606 OID 18372)
-- Name: department_milestones department_milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: Zach
--

ALTER TABLE ONLY public.department_milestones
    ADD CONSTRAINT department_milestones_pkey PRIMARY KEY (id);


--
-- TOC entry 4213 (class 2606 OID 18013)
-- Name: milestones milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: Zach
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_pkey PRIMARY KEY (id);


--
-- TOC entry 4224 (class 2606 OID 18304)
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: Zach
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- TOC entry 4226 (class 2606 OID 18306)
-- Name: projects projects_project_number_key; Type: CONSTRAINT; Schema: public; Owner: Zach
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_project_number_key UNIQUE (project_number);


--
-- TOC entry 4234 (class 2606 OID 18350)
-- Name: task_dependencies task_dependencies_pkey; Type: CONSTRAINT; Schema: public; Owner: Zach
--

ALTER TABLE ONLY public.task_dependencies
    ADD CONSTRAINT task_dependencies_pkey PRIMARY KEY (id);


--
-- TOC entry 4236 (class 2606 OID 18352)
-- Name: task_dependencies task_dependency_unique; Type: CONSTRAINT; Schema: public; Owner: Zach
--

ALTER TABLE ONLY public.task_dependencies
    ADD CONSTRAINT task_dependency_unique UNIQUE (task_id, depends_on_task_id);


--
-- TOC entry 4230 (class 2606 OID 18331)
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: Zach
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- TOC entry 4215 (class 2606 OID 18279)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: Zach
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4217 (class 2606 OID 18275)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: Zach
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4219 (class 2606 OID 18277)
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: Zach
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- TOC entry 4239 (class 1259 OID 18383)
-- Name: idx_department_milestones_project_id; Type: INDEX; Schema: public; Owner: Zach
--

CREATE INDEX idx_department_milestones_project_id ON public.department_milestones USING btree (project_id);


--
-- TOC entry 4211 (class 1259 OID 18031)
-- Name: idx_milestones_project_id; Type: INDEX; Schema: public; Owner: Zach
--

CREATE INDEX idx_milestones_project_id ON public.milestones USING btree (project_id);


--
-- TOC entry 4222 (class 1259 OID 18378)
-- Name: idx_projects_customer_id; Type: INDEX; Schema: public; Owner: Zach
--

CREATE INDEX idx_projects_customer_id ON public.projects USING btree (customer_id);


--
-- TOC entry 4231 (class 1259 OID 18382)
-- Name: idx_task_dependencies_depends_on_task_id; Type: INDEX; Schema: public; Owner: Zach
--

CREATE INDEX idx_task_dependencies_depends_on_task_id ON public.task_dependencies USING btree (depends_on_task_id);


--
-- TOC entry 4232 (class 1259 OID 18381)
-- Name: idx_task_dependencies_task_id; Type: INDEX; Schema: public; Owner: Zach
--

CREATE INDEX idx_task_dependencies_task_id ON public.task_dependencies USING btree (task_id);


--
-- TOC entry 4227 (class 1259 OID 18380)
-- Name: idx_tasks_assignee_id; Type: INDEX; Schema: public; Owner: Zach
--

CREATE INDEX idx_tasks_assignee_id ON public.tasks USING btree (assignee_id);


--
-- TOC entry 4228 (class 1259 OID 18379)
-- Name: idx_tasks_project_id; Type: INDEX; Schema: public; Owner: Zach
--

CREATE INDEX idx_tasks_project_id ON public.tasks USING btree (project_id);


--
-- TOC entry 4249 (class 2620 OID 18385)
-- Name: customers update_customers_timestamp; Type: TRIGGER; Schema: public; Owner: Zach
--

CREATE TRIGGER update_customers_timestamp BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- TOC entry 4252 (class 2620 OID 18388)
-- Name: department_milestones update_department_milestones_timestamp; Type: TRIGGER; Schema: public; Owner: Zach
--

CREATE TRIGGER update_department_milestones_timestamp BEFORE UPDATE ON public.department_milestones FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- TOC entry 4247 (class 2620 OID 18039)
-- Name: milestones update_milestones_updated_at; Type: TRIGGER; Schema: public; Owner: Zach
--

CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON public.milestones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4250 (class 2620 OID 18386)
-- Name: projects update_projects_timestamp; Type: TRIGGER; Schema: public; Owner: Zach
--

CREATE TRIGGER update_projects_timestamp BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- TOC entry 4251 (class 2620 OID 18387)
-- Name: tasks update_tasks_timestamp; Type: TRIGGER; Schema: public; Owner: Zach
--

CREATE TRIGGER update_tasks_timestamp BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- TOC entry 4248 (class 2620 OID 18384)
-- Name: users update_users_timestamp; Type: TRIGGER; Schema: public; Owner: Zach
--

CREATE TRIGGER update_users_timestamp BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- TOC entry 4246 (class 2606 OID 18373)
-- Name: department_milestones department_milestones_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: Zach
--

ALTER TABLE ONLY public.department_milestones
    ADD CONSTRAINT department_milestones_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- TOC entry 4240 (class 2606 OID 18307)
-- Name: projects projects_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: Zach
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- TOC entry 4241 (class 2606 OID 18312)
-- Name: projects projects_project_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: Zach
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_project_manager_id_fkey FOREIGN KEY (project_manager_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4244 (class 2606 OID 18358)
-- Name: task_dependencies task_dependencies_depends_on_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: Zach
--

ALTER TABLE ONLY public.task_dependencies
    ADD CONSTRAINT task_dependencies_depends_on_task_id_fkey FOREIGN KEY (depends_on_task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- TOC entry 4245 (class 2606 OID 18353)
-- Name: task_dependencies task_dependencies_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: Zach
--

ALTER TABLE ONLY public.task_dependencies
    ADD CONSTRAINT task_dependencies_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- TOC entry 4242 (class 2606 OID 18337)
-- Name: tasks tasks_assignee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: Zach
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4243 (class 2606 OID 18332)
-- Name: tasks tasks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: Zach
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- TOC entry 4403 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO "Zach";


-- Completed on 2025-05-01 12:35:49

--
-- PostgreSQL database dump complete
--

