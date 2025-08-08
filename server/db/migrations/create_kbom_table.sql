-- Create KBOM table for storing Bill of Materials data
-- This table will be used to link 3D models with Customer, Sales Orders, Work Orders, etc.

CREATE TABLE IF NOT EXISTS public.kbom (
    rowid integer NOT NULL,
    line_number numeric,
    item text,
    stock_number text,
    kit text,
    where_used text,
    unit_qty text,
    qty numeric,
    assy_reqd numeric,
    ext_qty numeric,
    drawing_no text,
    description text,
    part_type text,
    vendor text,
    material text,
    comment text,
    wo_number text,
    assembly_status text,
    current_workstation text,
    location text,
    est_start_date date,
    est_completion_date date,
    start_date date,
    completion_date date,
    est_hours numeric,
    drawing_pdf_links text,
    drawing_stp_links text,
    drawing_dxf_links text,
    drawing_igs_links text,
    where_used_pdf_links text,
    po_number text,
    po_date date,
    expected_date date,
    receive_status text,
    received_date date,
    received_location text,
    received_notes text,
    so integer,
    source_file text,
    title text,
    qty_on_hand text,
    order_status text,
    quote_req_date date,
    quote_in_date date,
    ordered_by text,
    cost_per_unit numeric(10,2),
    total_cost numeric(10,2),
    order_priority text,
    order_date date,
    assigned_to text,
    customer text,
    assembly_completed text,
    total_cost_cal money GENERATED ALWAYS AS ((cost_per_unit * ext_qty)) STORED,
    due_date date,
    parts_clear date,
    assembly_clear date,
    date_added date DEFAULT now(),
    date_modified date,
    modified_by text,
    preferred_vendor_id integer,
    traveler_status text DEFAULT ''::text,
    mfg_comment text,
    saw_time double precision,
    mach_time double precision,
    plas_time double precision,
    fab_time double precision,
    assembly_time double precision,
    saw_time_user character varying(50),
    mach_time_user character varying(50),
    plas_time_user character varying(50),
    fab_time_user character varying(50),
    assembly_time_user character varying(50),
    total_time double precision GENERATED ALWAYS AS (
        CASE
            WHEN ((((saw_time + mach_time) + plas_time) + fab_time) + assembly_time) IS NOT NULL THEN (((saw_time + mach_time) + plas_time) + fab_time) + assembly_time
            ELSE NULL::numeric
        END
    ) STORED,
    CONSTRAINT kbom_traveler_status_check CHECK ((traveler_status = ANY (ARRAY['cut'::text, 'machining'::text, 'done'::text, 'material shortage'::text, 'ready for ms'::text, 'ready for kit'::text, 'ready for inventory'::text, ''::text])))
);

-- Set ownership
ALTER TABLE public.kbom OWNER TO postgres;

-- Create primary key
ALTER TABLE ONLY public.kbom
    ADD CONSTRAINT kbom_pkey PRIMARY KEY (rowid);

-- Create indexes for better performance on KBOM lookups
CREATE INDEX IF NOT EXISTS idx_kbom_title ON public.kbom USING btree (title);
CREATE INDEX IF NOT EXISTS idx_kbom_customer ON public.kbom USING btree (customer);
CREATE INDEX IF NOT EXISTS idx_kbom_so ON public.kbom USING btree (so);
CREATE INDEX IF NOT EXISTS idx_kbom_wo_number ON public.kbom USING btree (wo_number);
CREATE INDEX IF NOT EXISTS idx_kbom_source_file ON public.kbom USING btree (source_file);

-- Insert some sample data for testing
INSERT INTO public.kbom (rowid, title, customer, so, wo_number, source_file, description, part_type) VALUES
(1, 'A1127869 Test Part', 'Knight Industrial', 12345, 'WO-001', 'A1127869.iam', 'Test part for 3D viewer KBOM integration', 'Fabricated'),
(2, 'B2001480 Sample Component', 'Knight Industrial', 12346, 'WO-002', 'B2001480.iam', 'Sample component for testing', 'Purchased'),
(3, '11073-1003 Assembly', 'Knight Industrial', 12347, 'WO-003', '11073-1003.iam', 'Test assembly for KBOM display', 'Assembly')
ON CONFLICT (rowid) DO NOTHING;

-- Add comment to table
COMMENT ON TABLE public.kbom IS 'Bill of Materials table containing part information, customer data, sales orders, and work orders for linking with 3D models';
