--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.2

-- Started on 2025-08-04 19:53:01

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
-- TOC entry 606 (class 1255 OID 17679)
-- Name: add_item_to_inventory_if_missing(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.add_item_to_inventory_if_missing() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    relevant_rowid INT;
    v_stock_number VARCHAR(100);
    v_description TEXT;
    v_item_id INT;
BEGIN
    -- Skip if this is a recursive call
    IF current_setting('inventory.in_trigger', TRUE) = 'true' THEN
        RETURN NEW;
    END IF;

    -- Set the session variable to prevent recursive calls
    PERFORM set_config('inventory.in_trigger', 'true', TRUE);

    -- If deleting a row in receiving_log, use OLD.kbom_rowid
    IF (TG_OP = 'DELETE') THEN
        relevant_rowid = OLD.kbom_rowid;
    ELSE
        relevant_rowid = NEW.kbom_rowid;
    END IF;

    -- If kbom_rowid is NULL, try to get stock_number directly from NEW
    IF relevant_rowid IS NULL THEN
        v_stock_number := NEW.stock_number;
    ELSE
        -- Retrieve stock_number and description from KBom for that rowid
        SELECT stock_number, description
          INTO v_stock_number, v_description
          FROM KBom
         WHERE rowid = relevant_rowid;
    END IF;

    -- If we don't have a stock number at this point, just return
    IF v_stock_number IS NULL THEN
        -- Reset the session variable before returning
        PERFORM set_config('inventory.in_trigger', 'false', TRUE);
        IF (TG_OP = 'DELETE') THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
    END IF;

    -- Check if the item already exists in inventory_items
    SELECT item_id
      INTO v_item_id
      FROM inventory_items
     WHERE stock_number = v_stock_number;

    IF v_item_id IS NULL THEN
        -- Insert a new item if not found
        INSERT INTO inventory_items (stock_number, description)
        VALUES (v_stock_number, v_description)
        RETURNING item_id INTO v_item_id;
    END IF;

    -- If deleting a receiving_log row, return
    IF (TG_OP = 'DELETE') THEN
        -- Reset the session variable before returning
        PERFORM set_config('inventory.in_trigger', 'false', TRUE);
        RETURN OLD;
    END IF;

    -- Insert or update inventory_storage with NEW.received_qty
    IF NEW.storage_unit_id IS NOT NULL THEN
        -- Use a direct UPDATE/INSERT to avoid triggering the manual adjustment trigger
        UPDATE inventory_storage
           SET quantity = quantity + NEW.received_qty
         WHERE item_id = v_item_id
           AND storage_unit_id = NEW.storage_unit_id;
           
        IF NOT FOUND THEN
            INSERT INTO inventory_storage (item_id, storage_unit_id, quantity)
            VALUES (v_item_id, NEW.storage_unit_id, NEW.received_qty);
        END IF;
    END IF;

    -- Reset the session variable
    PERFORM set_config('inventory.in_trigger', 'false', TRUE);

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.add_item_to_inventory_if_missing() OWNER TO postgres;

--
-- TOC entry 585 (class 1255 OID 28211)
-- Name: approve_manifest_section(integer, text, text, boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.approve_manifest_section(p_section_id integer, p_approval_team text, p_approved_by text, p_approved boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    CASE p_approval_team
        WHEN 'engineering' THEN
            UPDATE public.sales_manifest_sections
            SET engineering_approved = p_approved,
                engineering_approved_by = CASE WHEN p_approved THEN p_approved_by ELSE NULL END,
                engineering_approved_date = CASE WHEN p_approved THEN CURRENT_TIMESTAMP ELSE NULL END
            WHERE section_id = p_section_id;

        WHEN 'purchasing' THEN
            UPDATE public.sales_manifest_sections
            SET purchasing_approved = p_approved,
                purchasing_approved_by = CASE WHEN p_approved THEN p_approved_by ELSE NULL END,
                purchasing_approved_date = CASE WHEN p_approved THEN CURRENT_TIMESTAMP ELSE NULL END
            WHERE section_id = p_section_id;

        WHEN 'manufacturing' THEN
            UPDATE public.sales_manifest_sections
            SET manufacturing_approved = p_approved,
                manufacturing_approved_by = CASE WHEN p_approved THEN p_approved_by ELSE NULL END,
                manufacturing_approved_date = CASE WHEN p_approved THEN CURRENT_TIMESTAMP ELSE NULL END
            WHERE section_id = p_section_id;

        WHEN 'controls' THEN
            UPDATE public.sales_manifest_sections
            SET controls_approved = p_approved,
                controls_approved_by = CASE WHEN p_approved THEN p_approved_by ELSE NULL END,
                controls_approved_date = CASE WHEN p_approved THEN CURRENT_TIMESTAMP ELSE NULL END
            WHERE section_id = p_section_id;

        WHEN 'programming' THEN
            UPDATE public.sales_manifest_sections
            SET programming_approved = p_approved,
                programming_approved_by = CASE WHEN p_approved THEN p_approved_by ELSE NULL END,
                programming_approved_date = CASE WHEN p_approved THEN CURRENT_TIMESTAMP ELSE NULL END
            WHERE section_id = p_section_id;

        WHEN 'accounting' THEN
            UPDATE public.sales_manifest_sections
            SET accounting_approved = p_approved,
                accounting_approved_by = CASE WHEN p_approved THEN p_approved_by ELSE NULL END,
                accounting_approved_date = CASE WHEN p_approved THEN CURRENT_TIMESTAMP ELSE NULL END
            WHERE section_id = p_section_id;

        ELSE
            RAISE EXCEPTION 'Invalid approval team: %', p_approval_team;
    END CASE;
END;
$$;


ALTER FUNCTION public.approve_manifest_section(p_section_id integer, p_approval_team text, p_approved_by text, p_approved boolean) OWNER TO postgres;

--
-- TOC entry 608 (class 1255 OID 18937)
-- Name: bom_audit_columns(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.bom_audit_columns() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.date_added IS NULL THEN
            NEW.date_added := CURRENT_DATE;
        END IF;
        NEW.date_modified := CURRENT_DATE;
        IF NEW.modified_by IS NULL THEN
            NEW.modified_by := current_user;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW IS DISTINCT FROM OLD THEN
            NEW.date_modified := CURRENT_DATE;
            NEW.modified_by := current_user;
            RETURN NEW;
        ELSE
            RETURN OLD;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.bom_audit_columns() OWNER TO postgres;

--
-- TOC entry 614 (class 1255 OID 28316)
-- Name: capture_kbom_daily_changes(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.capture_kbom_daily_changes() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    changes_count INTEGER;
BEGIN
    -- Insert daily changes by comparing today’s snapshot with yesterday’s
    INSERT INTO kbom_daily_changes (
        change_date, so, source_file, customer,
        total_items_start, total_items_end,
        completed_start, completed_end,
        ordered_start, ordered_end,
        received_start, received_end,
        items_added, items_completed_today,
        items_ordered_today, items_received_today,
        cost_added, cost_ordered_today,
        cost_received_today, percent_change
    )
    SELECT
        CURRENT_DATE,
        COALESCE(t.so, y.so) AS so,
        COALESCE(t.source_file, y.source_file) AS source_file,
        COALESCE(t.customer, y.customer) AS customer,

        -- Start (yesterday) and end (today) values
        COALESCE(y.total_items, 0) AS total_items_start,
        COALESCE(t.total_items, 0) AS total_items_end,
        COALESCE(y.items_completed, 0) AS completed_start,
        COALESCE(t.items_completed, 0) AS completed_end,
        COALESCE(y.items_ordered, 0) AS ordered_start,
        COALESCE(t.items_ordered, 0) AS ordered_end,
        COALESCE(y.items_received, 0) AS received_start,
        COALESCE(t.items_received, 0) AS received_end,

        -- Daily deltas
        GREATEST(0, COALESCE(t.total_items, 0) - COALESCE(y.total_items, 0)) AS items_added,
        GREATEST(0, COALESCE(t.items_completed, 0) - COALESCE(y.items_completed, 0)) AS items_completed_today,
        GREATEST(0, COALESCE(t.items_ordered, 0) - COALESCE(y.items_ordered, 0)) AS items_ordered_today,
        GREATEST(0, COALESCE(t.items_received, 0) - COALESCE(y.items_received, 0)) AS items_received_today,

        -- Cost deltas
        GREATEST(0, COALESCE(t.total_cost, 0) - COALESCE(y.total_cost, 0)) AS cost_added,
        GREATEST(0, COALESCE(t.ordered_cost, 0) - COALESCE(y.ordered_cost, 0)) AS cost_ordered_today,
        GREATEST(0, COALESCE(t.received_cost, 0) - COALESCE(y.received_cost, 0)) AS cost_received_today,

        -- Percent change
        CASE
            WHEN COALESCE(y.percent_complete, 0) = 0 THEN COALESCE(t.percent_complete, 0)
            ELSE COALESCE(t.percent_complete, 0) - COALESCE(y.percent_complete, 0)
        END AS percent_change

    FROM (
        SELECT * FROM kbom_history_snapshots
        WHERE snapshot_date = CURRENT_DATE
    ) t
    FULL OUTER JOIN (
        SELECT * FROM kbom_history_snapshots
        WHERE snapshot_date = CURRENT_DATE - INTERVAL '1 day'
    ) y
    ON t.so = y.so AND t.source_file = y.source_file

    WHERE NOT EXISTS (
        SELECT 1
        FROM kbom_daily_changes
        WHERE change_date = CURRENT_DATE
          AND so = COALESCE(t.so, y.so)
          AND source_file = COALESCE(t.source_file, y.source_file)
    );

    GET DIAGNOSTICS changes_count = ROW_COUNT;
    RETURN changes_count;
END;
$$;


ALTER FUNCTION public.capture_kbom_daily_changes() OWNER TO postgres;

--
-- TOC entry 613 (class 1255 OID 28282)
-- Name: capture_kbom_snapshot(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.capture_kbom_snapshot() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    rows_inserted INTEGER;
BEGIN
    -- Check if snapshot already exists for today
    IF EXISTS (
        SELECT 1
        FROM kbom_history_snapshots
        WHERE snapshot_date = CURRENT_DATE
    ) THEN
        RETURN 0;
    END IF;

    -- Insert snapshot data
    INSERT INTO kbom_history_snapshots (
        so, source_file, customer,
        assembly_status_counts, order_status_counts, receive_status_counts,
        total_items, items_completed, items_ordered, items_received,
        percent_complete, part_type_counts,
        total_cost, ordered_cost, received_cost,
        days_until_due
    )
    SELECT
        k.so,
        k.source_file,
        k.customer,

        -- Status counts as JSON with NULL handling
        COALESCE((
            SELECT jsonb_object_agg(status, count)
            FROM (
                SELECT assembly_status AS status, COUNT(*) AS count
                FROM kbom k2
                WHERE k2.so = k.so
                  AND k2.source_file = k.source_file
                  AND assembly_status IS NOT NULL
                GROUP BY assembly_status
            ) s
        ), '{}'::jsonb) AS assembly_status_counts,

        COALESCE((
            SELECT jsonb_object_agg(status, count)
            FROM (
                SELECT order_status AS status, COUNT(*) AS count
                FROM kbom k2
                WHERE k2.so = k.so
                  AND k2.source_file = k.source_file
                  AND order_status IS NOT NULL
                GROUP BY order_status
            ) s
        ), '{}'::jsonb) AS order_status_counts,

        COALESCE((
            SELECT jsonb_object_agg(status, count)
            FROM (
                SELECT receive_status AS status, COUNT(*) AS count
                FROM kbom k2
                WHERE k2.so = k.so
                  AND k2.source_file = k.source_file
                  AND receive_status IS NOT NULL
                GROUP BY receive_status
            ) s
        ), '{}'::jsonb) AS receive_status_counts,

        -- Item counts
        COUNT(*) AS total_items,
        COUNT(CASE WHEN k.assembly_status IN ('completed', 'NA') THEN 1 END) AS items_completed,
        COUNT(CASE WHEN k.order_status = 'ordered' THEN 1 END) AS items_ordered,
        COUNT(CASE WHEN k.receive_status IN ('received', 'received full', 'received & kitted') THEN 1 END) AS items_received,

        -- Percent complete
        ROUND(
            COUNT(CASE WHEN k.assembly_status IN ('completed', 'NA') THEN 1 END)::DECIMAL /
            NULLIF(COUNT(*), 0) * 100,
            2
        ) AS percent_complete,

        -- Part type breakdown with NULL handling
        COALESCE((
            SELECT jsonb_object_agg(part_type, count)
            FROM (
                SELECT part_type, COUNT(*) AS count
                FROM kbom k2
                WHERE k2.so = k.so
                  AND k2.source_file = k.source_file
                  AND part_type IS NOT NULL
                GROUP BY part_type
            ) p
        ), '{}'::jsonb) AS part_type_counts,

        -- Financial metrics
        COALESCE(SUM(k.total_cost), 0) AS total_cost,
        COALESCE(SUM(CASE WHEN k.order_status = 'ordered' THEN k.total_cost ELSE 0 END), 0) AS ordered_cost,
        COALESCE(SUM(CASE WHEN k.receive_status IN ('received', 'received full', 'received & kitted') THEN k.total_cost ELSE 0 END), 0) AS received_cost,

        -- Days until due
        MIN(k.due_date::date - CURRENT_DATE) AS days_until_due

    FROM kbom k
    WHERE k.assembly_status NOT IN ('completed', 'NA')
       OR k.assembly_status IS NULL
    GROUP BY k.so, k.source_file, k.customer;

    GET DIAGNOSTICS rows_inserted = ROW_COUNT;
    RETURN rows_inserted;
END;
$$;


ALTER FUNCTION public.capture_kbom_snapshot() OWNER TO postgres;

--
-- TOC entry 599 (class 1255 OID 17687)
-- Name: fill_receiving_log_fields(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fill_receiving_log_fields() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Only update fields if kbom_rowid is not NULL
    IF NEW.kbom_rowid IS NOT NULL THEN
        -- Update the just-inserted receiving_log row
        -- by pulling so, source_file, stock_number from KBom
        UPDATE receiving_log rl
           SET so = kb.so,
               source_file = kb.source_file,
               stock_number = kb.stock_number
          FROM KBom kb
         WHERE kb.rowid = NEW.kbom_rowid
           AND rl.receiving_id = NEW.receiving_id;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.fill_receiving_log_fields() OWNER TO postgres;

--
-- TOC entry 604 (class 1255 OID 28143)
-- Name: is_source_file_complete(integer, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_source_file_complete(p_so integer, p_source_file character varying) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    incomplete_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO incomplete_count
    FROM kbom
    WHERE so = p_so
      AND source_file = p_source_file
      AND (assembly_status IS NULL
           OR LOWER(assembly_status) NOT IN ('completed', 'na', 'n/a', ''));

    RETURN incomplete_count = 0;
END;
$$;


ALTER FUNCTION public.is_source_file_complete(p_so integer, p_source_file character varying) OWNER TO postgres;

--
-- TOC entry 598 (class 1255 OID 17127)
-- Name: kbom_audit_columns(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kbom_audit_columns() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.date_added IS NULL THEN
      NEW.date_added := now();
    END IF;
    NEW.date_modified := now();
    IF NEW.modified_by IS NULL THEN
      NEW.modified_by := current_user;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW IS DISTINCT FROM OLD THEN
      NEW.date_modified := now();
      NEW.modified_by := current_user;
      RETURN NEW;
    ELSE
      RETURN OLD;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.kbom_audit_columns() OWNER TO postgres;

--
-- TOC entry 600 (class 1255 OID 17765)
-- Name: log_manual_inventory_adjustment(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.log_manual_inventory_adjustment() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Skip if this is a recursive call
    IF current_setting('inventory.in_trigger', TRUE) = 'true' THEN
        RETURN NEW;
    END IF;

    -- Set the session variable to prevent recursive calls
    PERFORM set_config('inventory.in_trigger', 'true', TRUE);

    -- For INSERT operations
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO receiving_log (
            received_date,
            received_qty,
            stock_number,
            storage_unit_id,
            notes,
            kbom_rowid,
            received_by
        )
        SELECT 
            CURRENT_TIMESTAMP,
            NEW.quantity,
            ii.stock_number,
            NEW.storage_unit_id,
            'Manual inventory addition',
            NULL,
            current_user
        FROM inventory_items ii
        WHERE ii.item_id = NEW.item_id;
        
    -- For UPDATE operations
    ELSIF (TG_OP = 'UPDATE') AND (NEW.quantity != OLD.quantity) THEN
        -- Handle quantity changes
        IF NEW.quantity > OLD.quantity THEN
            -- For increases in quantity
            INSERT INTO receiving_log (
                received_date,
                received_qty,
                stock_number,
                storage_unit_id,
                notes,
                kbom_rowid,
                received_by
            )
            SELECT 
                CURRENT_TIMESTAMP,
                (NEW.quantity - OLD.quantity),
                ii.stock_number,
                NEW.storage_unit_id,
                'Manual inventory increase from ' || OLD.quantity || ' to ' || NEW.quantity,
                NULL,
                current_user
            FROM inventory_items ii
            WHERE ii.item_id = NEW.item_id;
        ELSE
            -- For decreases in quantity
            INSERT INTO receiving_log (
                received_date,
                received_qty,
                stock_number,
                storage_unit_id,
                notes,
                kbom_rowid,
                received_by
            )
            SELECT 
                CURRENT_TIMESTAMP,
                ABS(OLD.quantity - NEW.quantity), -- Use absolute value for received_qty
                ii.stock_number,
                NEW.storage_unit_id,
                'Manual inventory reduction from ' || OLD.quantity || ' to ' || NEW.quantity,
                NULL,
                current_user
            FROM inventory_items ii
            WHERE ii.item_id = NEW.item_id;
        END IF;
    END IF;

    -- Reset the session variable
    PERFORM set_config('inventory.in_trigger', 'false', TRUE);

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.log_manual_inventory_adjustment() OWNER TO postgres;

--
-- TOC entry 605 (class 1255 OID 17716)
-- Name: pull_inventory_on_kitted(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.pull_inventory_on_kitted() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_item_id INTEGER;
    v_pull_qty INTEGER;
    v_storage_unit_id INTEGER;
BEGIN
    -- Only proceed if the new receive_status is exactly 'received & kitted'
    -- and it wasn't that before.
    IF NEW.receive_status = 'received & kitted' 
       AND (OLD.receive_status IS DISTINCT FROM 'received & kitted') THEN

        -- Look up the item_id from inventory_items based on the stock_number in KBom.
        SELECT item_id INTO v_item_id
          FROM inventory_items
         WHERE stock_number = NEW.stock_number;
         
        IF v_item_id IS NULL THEN
            RAISE EXCEPTION 'Item not found for stock_number %', NEW.stock_number;
        END IF;
        
        -- Define the pull quantity as the expected quantity from KBom.
        v_pull_qty := NEW.ext_qty;
        
        -- Retrieve the storage_unit_id from the most recent receiving_log for this KBom row.
        SELECT storage_unit_id INTO v_storage_unit_id
          FROM receiving_log
         WHERE kbom_rowid = NEW.rowid
         ORDER BY received_date DESC
         LIMIT 1;
         
        IF v_storage_unit_id IS NULL THEN
            RAISE EXCEPTION 'No storage unit found for KBom row %', NEW.rowid;
        END IF;
        
        -- Subtract the pulled quantity from the on-hand quantity in inventory_storage
        UPDATE inventory_storage
           SET quantity = quantity - v_pull_qty
         WHERE item_id = v_item_id
           AND storage_unit_id = v_storage_unit_id;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.pull_inventory_on_kitted() OWNER TO postgres;

--
-- TOC entry 610 (class 1255 OID 28217)
-- Name: toggle_item_tracking(integer, text, boolean, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.toggle_item_tracking(p_item_id integer, p_tracking_type text, p_checked boolean, p_user text) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    CASE p_tracking_type
        WHEN 'cad_released' THEN
            UPDATE public.sales_manifest_items
            SET engineering_cad_released = p_checked,
                engineering_cad_released_by = CASE WHEN p_checked THEN p_user ELSE NULL END,
                engineering_cad_released_date = CASE WHEN p_checked THEN CURRENT_TIMESTAMP ELSE NULL END
            WHERE item_id = p_item_id;

        WHEN 'mrp_uploaded' THEN
            UPDATE public.sales_manifest_items
            SET uploaded_to_mrp = p_checked,
                uploaded_to_mrp_by = CASE WHEN p_checked THEN p_user ELSE NULL END,
                uploaded_to_mrp_date = CASE WHEN p_checked THEN CURRENT_TIMESTAMP ELSE NULL END
            WHERE item_id = p_item_id;

        ELSE
            RAISE EXCEPTION 'Invalid tracking type: %', p_tracking_type;
    END CASE;
END;
$$;


ALTER FUNCTION public.toggle_item_tracking(p_item_id integer, p_tracking_type text, p_checked boolean, p_user text) OWNER TO postgres;

--
-- TOC entry 612 (class 1255 OID 17771)
-- Name: update_all_kbom_qty_on_hand(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_all_kbom_qty_on_hand() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Update qty_on_hand for all stock numbers
    WITH total_inventory AS (
        -- Get total quantity in inventory_storage
        SELECT ii.stock_number,
               COALESCE(SUM(is_storage.quantity), 0) as total_qty
        FROM inventory_items ii
        LEFT JOIN inventory_storage is_storage ON ii.item_id = is_storage.item_id
        GROUP BY ii.stock_number
    ),
    assigned_inventory AS (
        -- Get quantity assigned to SOs or source_files
        SELECT stock_number,
               COALESCE(SUM(received_qty), 0) as assigned_qty
        FROM receiving_log
        WHERE so IS NOT NULL OR source_file IS NOT NULL
        GROUP BY stock_number
    )
    UPDATE KBom kb
    SET qty_on_hand = GREATEST(ti.total_qty - COALESCE(ai.assigned_qty, 0), 0)
    FROM total_inventory ti
    LEFT JOIN assigned_inventory ai ON ai.stock_number = ti.stock_number
    WHERE kb.stock_number = ti.stock_number;
END;
$$;


ALTER FUNCTION public.update_all_kbom_qty_on_hand() OWNER TO postgres;

--
-- TOC entry 609 (class 1255 OID 18941)
-- Name: update_bom_details_on_item_change(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_bom_details_on_item_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Update any BOM details that reference this item
    UPDATE public.bom_details
    SET date_modified = CURRENT_DATE,
        modified_by = current_user
    WHERE item_id = NEW.item_id;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_bom_details_on_item_change() OWNER TO postgres;

--
-- TOC entry 607 (class 1255 OID 17770)
-- Name: update_kbom_qty_on_hand(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_kbom_qty_on_hand() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_stock_number text;
BEGIN
    -- Get the stock_number based on the trigger source and operation
    IF TG_TABLE_NAME = 'inventory_storage' THEN
        -- For inventory_storage triggers
        IF TG_OP = 'DELETE' THEN
            SELECT ii.stock_number INTO v_stock_number
            FROM inventory_items ii
            WHERE ii.item_id = OLD.item_id;
        ELSE
            SELECT ii.stock_number INTO v_stock_number
            FROM inventory_items ii
            WHERE ii.item_id = NEW.item_id;
        END IF;
    ELSE
        -- For receiving_log triggers
        IF TG_OP = 'DELETE' THEN
            v_stock_number := OLD.stock_number;
        ELSE
            v_stock_number := NEW.stock_number;
        END IF;
    END IF;

    -- Skip if we couldn't determine the stock number
    IF v_stock_number IS NULL THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
    END IF;

    -- Update qty_on_hand for the affected stock number
    WITH total_inventory AS (
        -- Get total quantity in inventory_storage
        SELECT ii.stock_number,
               COALESCE(SUM(is_storage.quantity), 0) as total_qty
        FROM inventory_items ii
        LEFT JOIN inventory_storage is_storage ON ii.item_id = is_storage.item_id
        WHERE ii.stock_number = v_stock_number
        GROUP BY ii.stock_number
    ),
    assigned_inventory AS (
        -- Get quantity assigned to SOs or source_files
        SELECT stock_number,
               COALESCE(SUM(received_qty), 0) as assigned_qty
        FROM receiving_log
        WHERE stock_number = v_stock_number
        AND (so IS NOT NULL OR source_file IS NOT NULL)
        GROUP BY stock_number
    )
    UPDATE KBom kb
    SET qty_on_hand = GREATEST(ti.total_qty - COALESCE(ai.assigned_qty, 0), 0)
    FROM total_inventory ti
    LEFT JOIN assigned_inventory ai ON ai.stock_number = ti.stock_number
    WHERE kb.stock_number = ti.stock_number;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_kbom_qty_on_hand() OWNER TO postgres;

--
-- TOC entry 611 (class 1255 OID 17677)
-- Name: update_kbom_receive_status(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_kbom_receive_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    relevant_rowid INT;
    total_received INT;
    expected_qty INT;
    new_status TEXT;
    current_status TEXT;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        relevant_rowid = OLD.kbom_rowid;
    ELSE
        relevant_rowid = NEW.kbom_rowid;
    END IF;

    -- If kbom_rowid is NULL, just return without doing anything
    IF relevant_rowid IS NULL THEN
        IF (TG_OP = 'DELETE') THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
    END IF;

    -- Get the cumulative received quantity for this KBom row.
    SELECT COALESCE(SUM(received_qty), 0)
      INTO total_received
      FROM receiving_log
     WHERE kbom_rowid = relevant_rowid;

    -- Get the expected quantity from KBom.
    SELECT ext_qty
      INTO expected_qty
      FROM KBom
     WHERE rowid = relevant_rowid;

    IF expected_qty IS NULL THEN
        IF (TG_OP = 'DELETE') THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
    END IF;

    -- Determine the new status based on total_received vs. expected_qty.
    IF total_received >= expected_qty THEN
        new_status := 'received';
    ELSIF total_received > 0 THEN
        new_status := 'partially received';
    ELSE
        new_status := 'not received';
    END IF;

    -- Get the current status from KBom.
    SELECT receive_status INTO current_status
      FROM KBom
     WHERE rowid = relevant_rowid;

    -- Only update if there is a change.
    IF current_status IS DISTINCT FROM new_status THEN
        UPDATE KBom
           SET receive_status = new_status
         WHERE rowid = relevant_rowid;
    END IF;

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;


ALTER FUNCTION public.update_kbom_receive_status() OWNER TO postgres;

--
-- TOC entry 602 (class 1255 OID 27755)
-- Name: update_modified_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_modified_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.modified_at = CURRENT_TIMESTAMP;
    NEW.modified_by = CURRENT_USER;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_modified_column() OWNER TO postgres;

--
-- TOC entry 586 (class 1255 OID 27819)
-- Name: update_modified_time(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_modified_time() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.modified_at := CURRENT_TIMESTAMP;
    NEW.modified_by := CURRENT_USER;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_modified_time() OWNER TO postgres;

--
-- TOC entry 601 (class 1255 OID 17799)
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

--
-- TOC entry 603 (class 1255 OID 18706)
-- Name: update_user_fields(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_user_fields() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.saw_time IS DISTINCT FROM OLD.saw_time THEN
        NEW.saw_time_user := current_setting('myapp.current_user');
    END IF;
    IF NEW.mach_time IS DISTINCT FROM OLD.mach_time THEN
        NEW.mach_time_user := current_setting('myapp.current_user');
    END IF;
    IF NEW.fab_time IS DISTINCT FROM OLD.fab_time THEN
        NEW.fab_time_user := current_setting('myapp.current_user');
    END IF;
    IF NEW.plas_time IS DISTINCT FROM OLD.plas_time THEN
        NEW.plas_time_user := current_setting('myapp.current_user');
    END IF;
    IF NEW.assembly_time IS DISTINCT FROM OLD.assembly_time THEN
        NEW.assembly_time_user := current_setting('myapp.current_user');
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_user_fields() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 576 (class 1259 OID 28062)
-- Name: sales_manifest_parts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_manifest_parts (
    part_id integer NOT NULL,
    part_number character varying(100) NOT NULL,
    description text,
    cost_each numeric(12,2),
    category character varying(100),
    notes text,
    created_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(50),
    modified_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    modified_by character varying(50),
    active boolean DEFAULT true
);


ALTER TABLE public.sales_manifest_parts OWNER TO postgres;

--
-- TOC entry 577 (class 1259 OID 28078)
-- Name: active_manifest_parts; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.active_manifest_parts AS
 SELECT part_id,
    part_number,
    description,
    cost_each,
    category,
    notes,
    created_date,
    created_by,
    modified_date,
    modified_by,
    active
   FROM public.sales_manifest_parts
  WHERE (active = true)
  ORDER BY part_number;


ALTER VIEW public.active_manifest_parts OWNER TO postgres;

--
-- TOC entry 536 (class 1259 OID 17779)
-- Name: app_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_settings (
    setting_name text NOT NULL,
    setting_value jsonb
);


ALTER TABLE public.app_settings OWNER TO postgres;

--
-- TOC entry 5095 (class 0 OID 0)
-- Dependencies: 536
-- Name: TABLE app_settings; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.app_settings IS 'Stores application-wide settings in JSONB format';


--
-- TOC entry 541 (class 1259 OID 25973)
-- Name: bom_header; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bom_header (
    bom_id bigint NOT NULL,
    parent_stock_number text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    revision text,
    current_rev text
);


ALTER TABLE public.bom_header OWNER TO postgres;

--
-- TOC entry 540 (class 1259 OID 25972)
-- Name: bom_header_bom_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bom_header_bom_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bom_header_bom_id_seq OWNER TO postgres;

--
-- TOC entry 5098 (class 0 OID 0)
-- Dependencies: 540
-- Name: bom_header_bom_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bom_header_bom_id_seq OWNED BY public.bom_header.bom_id;


--
-- TOC entry 543 (class 1259 OID 25988)
-- Name: bom_line; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bom_line (
    line_id bigint NOT NULL,
    bom_id bigint NOT NULL,
    component_stock_number text NOT NULL,
    unit_qty text NOT NULL,
    qty numeric NOT NULL,
    item_text text,
    item_index bigint DEFAULT 0,
    assy_reqd numeric,
    line_number numeric,
    where_used text
);


ALTER TABLE public.bom_line OWNER TO postgres;

--
-- TOC entry 542 (class 1259 OID 25987)
-- Name: bom_line_line_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bom_line_line_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bom_line_line_id_seq OWNER TO postgres;

--
-- TOC entry 5100 (class 0 OID 0)
-- Dependencies: 542
-- Name: bom_line_line_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bom_line_line_id_seq OWNED BY public.bom_line.line_id;


--
-- TOC entry 531 (class 1259 OID 17625)
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_items (
    item_id integer NOT NULL,
    stock_number character varying(100) NOT NULL,
    description text,
    last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.inventory_items OWNER TO postgres;

--
-- TOC entry 530 (class 1259 OID 17624)
-- Name: inventory_items_item_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventory_items_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_items_item_id_seq OWNER TO postgres;

--
-- TOC entry 5102 (class 0 OID 0)
-- Dependencies: 530
-- Name: inventory_items_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventory_items_item_id_seq OWNED BY public.inventory_items.item_id;


--
-- TOC entry 533 (class 1259 OID 17637)
-- Name: inventory_storage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_storage (
    inventory_storage_id integer NOT NULL,
    item_id integer NOT NULL,
    storage_unit_id integer NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.inventory_storage OWNER TO postgres;

--
-- TOC entry 532 (class 1259 OID 17636)
-- Name: inventory_storage_inventory_storage_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventory_storage_inventory_storage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_storage_inventory_storage_id_seq OWNER TO postgres;

--
-- TOC entry 5104 (class 0 OID 0)
-- Dependencies: 532
-- Name: inventory_storage_inventory_storage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventory_storage_inventory_storage_id_seq OWNED BY public.inventory_storage.inventory_storage_id;


--
-- TOC entry 539 (class 1259 OID 24693)
-- Name: item_master; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.item_master (
    stock_number text NOT NULL,
    description text NOT NULL,
    part_type text NOT NULL,
    drawing_no text,
    unit_qty text,
    commodity_code text
);


ALTER TABLE public.item_master OWNER TO postgres;

--
-- TOC entry 520 (class 1259 OID 16441)
-- Name: kbom; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.kbom (
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
    fab_time_user character varying(50),
    plas_time_user character varying(50),
    assembly_time_user character varying(50),
    quote_number text,
    revised_qty numeric[],
    engineering_comments text,
    hours numeric GENERATED ALWAYS AS (((((COALESCE(saw_time, (0)::double precision) + COALESCE(mach_time, (0)::double precision)) + COALESCE(fab_time, (0)::double precision)) + COALESCE(plas_time, (0)::double precision)) + COALESCE(assembly_time, (0)::double precision))) STORED,
    tag_number numeric,
    bom_rev text,
    outsourcing_vendor text,
    outsourcing_location text,
    outsourcing_comments text,
    outsourcing_expected_date date,
    build_qty_cal numeric GENERATED ALWAYS AS (
CASE
    WHEN ((qty <> (0)::numeric) AND (assy_reqd <> (0)::numeric)) THEN floor(((ext_qty / qty) / assy_reqd))
    ELSE NULL::numeric
END) STORED,
    CONSTRAINT kbom_traveler_status_check CHECK ((traveler_status = ANY (ARRAY['cut'::text, 'machining'::text, 'done'::text, 'material shortage'::text, 'ready for ms'::text, 'ready for kit'::text, 'ready for inventory'::text, ''::text])))
);


ALTER TABLE public.kbom OWNER TO postgres;

--
-- TOC entry 582 (class 1259 OID 28284)
-- Name: kbom_daily_changes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.kbom_daily_changes (
    change_id integer NOT NULL,
    change_date date DEFAULT CURRENT_DATE NOT NULL,
    so integer,
    source_file character varying(255),
    metric_name character varying(100),
    previous_value text,
    current_value text,
    change_amount text,
    change_percentage numeric(10,2),
    items_added integer DEFAULT 0,
    items_completed_today integer DEFAULT 0,
    items_ordered_today integer DEFAULT 0,
    items_received_today integer DEFAULT 0,
    cost_added numeric(10,2) DEFAULT 0,
    cost_ordered_today numeric(10,2) DEFAULT 0,
    cost_received_today numeric(10,2) DEFAULT 0,
    percent_change numeric(5,2) DEFAULT 0
);


ALTER TABLE public.kbom_daily_changes OWNER TO postgres;

--
-- TOC entry 581 (class 1259 OID 28283)
-- Name: kbom_daily_changes_change_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.kbom_daily_changes_change_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.kbom_daily_changes_change_id_seq OWNER TO postgres;

--
-- TOC entry 5108 (class 0 OID 0)
-- Dependencies: 581
-- Name: kbom_daily_changes_change_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.kbom_daily_changes_change_id_seq OWNED BY public.kbom_daily_changes.change_id;


--
-- TOC entry 580 (class 1259 OID 28268)
-- Name: kbom_history_snapshots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.kbom_history_snapshots (
    snapshot_id integer NOT NULL,
    snapshot_date date DEFAULT CURRENT_DATE NOT NULL,
    snapshot_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    so integer,
    source_file character varying(255),
    customer character varying(255),
    assembly_status_counts jsonb,
    order_status_counts jsonb,
    receive_status_counts jsonb,
    total_items integer,
    items_completed integer,
    items_ordered integer,
    items_received integer,
    percent_complete numeric(5,2),
    part_type_counts jsonb,
    total_cost numeric(12,2),
    ordered_cost numeric(12,2),
    received_cost numeric(12,2),
    days_until_due integer,
    created_by character varying(50) DEFAULT 'system'::character varying
);


ALTER TABLE public.kbom_history_snapshots OWNER TO postgres;

--
-- TOC entry 584 (class 1259 OID 28300)
-- Name: kbom_daily_progress; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.kbom_daily_progress AS
 WITH snapshot_pairs AS (
         SELECT h1.so,
            h1.source_file,
            h1.customer,
            h1.snapshot_date AS "current_date",
            h1.percent_complete AS current_percent,
            h1.items_completed AS current_completed,
            h1.total_cost AS current_cost,
            h2.snapshot_date AS previous_date,
            h2.percent_complete AS previous_percent,
            h2.items_completed AS previous_completed,
            h2.total_cost AS previous_cost
           FROM (public.kbom_history_snapshots h1
             LEFT JOIN LATERAL ( SELECT h2_1.snapshot_id,
                    h2_1.snapshot_date,
                    h2_1.snapshot_time,
                    h2_1.so,
                    h2_1.source_file,
                    h2_1.customer,
                    h2_1.assembly_status_counts,
                    h2_1.order_status_counts,
                    h2_1.receive_status_counts,
                    h2_1.total_items,
                    h2_1.items_completed,
                    h2_1.items_ordered,
                    h2_1.items_received,
                    h2_1.percent_complete,
                    h2_1.part_type_counts,
                    h2_1.total_cost,
                    h2_1.ordered_cost,
                    h2_1.received_cost,
                    h2_1.days_until_due,
                    h2_1.created_by
                   FROM public.kbom_history_snapshots h2_1
                  WHERE ((h2_1.so = h1.so) AND ((h2_1.source_file)::text = (h1.source_file)::text) AND (h2_1.snapshot_date < h1.snapshot_date))
                  ORDER BY h2_1.snapshot_date DESC
                 LIMIT 1) h2 ON (true))
        )
 SELECT so,
    source_file,
    customer,
    CURRENT_DATE AS "current_date",
    current_percent,
    current_completed,
    COALESCE((current_percent - previous_percent), (0)::numeric) AS percent_change,
    COALESCE((current_completed - previous_completed), 0) AS items_completed_change,
        CASE
            WHEN ((previous_percent IS NULL) OR (previous_percent = (0)::numeric)) THEN NULL::numeric
            ELSE round((((current_percent - previous_percent) / previous_percent) * (100)::numeric), 2)
        END AS percent_change_rate
   FROM snapshot_pairs
  ORDER BY CURRENT_DATE DESC, so, source_file;


ALTER VIEW public.kbom_daily_progress OWNER TO postgres;

--
-- TOC entry 579 (class 1259 OID 28267)
-- Name: kbom_history_snapshots_snapshot_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.kbom_history_snapshots_snapshot_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.kbom_history_snapshots_snapshot_id_seq OWNER TO postgres;

--
-- TOC entry 5111 (class 0 OID 0)
-- Dependencies: 579
-- Name: kbom_history_snapshots_snapshot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.kbom_history_snapshots_snapshot_id_seq OWNED BY public.kbom_history_snapshots.snapshot_id;


--
-- TOC entry 519 (class 1259 OID 16440)
-- Name: kbom_rowid_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.kbom_rowid_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.kbom_rowid_seq OWNER TO postgres;

--
-- TOC entry 5112 (class 0 OID 0)
-- Dependencies: 519
-- Name: kbom_rowid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.kbom_rowid_seq OWNED BY public.kbom.rowid;


--
-- TOC entry 583 (class 1259 OID 28295)
-- Name: kbom_weekly_trends; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.kbom_weekly_trends AS
 SELECT so,
    source_file,
    customer,
    date_trunc('week'::text, (snapshot_date)::timestamp with time zone) AS week_start,
    avg(percent_complete) AS avg_percent_complete,
    max(percent_complete) AS max_percent_complete,
    avg(total_items) AS avg_total_items,
    avg(items_completed) AS avg_items_completed,
    avg(total_cost) AS avg_total_cost,
    min(days_until_due) AS min_days_until_due
   FROM public.kbom_history_snapshots
  GROUP BY so, source_file, customer, (date_trunc('week'::text, (snapshot_date)::timestamp with time zone))
  ORDER BY so, source_file, (date_trunc('week'::text, (snapshot_date)::timestamp with time zone));


ALTER VIEW public.kbom_weekly_trends OWNER TO postgres;

--
-- TOC entry 538 (class 1259 OID 17787)
-- Name: mfg_schedule; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mfg_schedule (
    rowid integer NOT NULL,
    so integer NOT NULL,
    source_file text NOT NULL,
    est_start_date date NOT NULL,
    est_completion_date date NOT NULL,
    est_hours integer NOT NULL,
    workstation text NOT NULL,
    sequence_order integer NOT NULL,
    kbom_rowid integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.mfg_schedule OWNER TO postgres;

--
-- TOC entry 5114 (class 0 OID 0)
-- Dependencies: 538
-- Name: TABLE mfg_schedule; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.mfg_schedule IS 'Stores manufacturing schedule information for source files';


--
-- TOC entry 5115 (class 0 OID 0)
-- Dependencies: 538
-- Name: COLUMN mfg_schedule.so; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.mfg_schedule.so IS 'Sales Order number';


--
-- TOC entry 5116 (class 0 OID 0)
-- Dependencies: 538
-- Name: COLUMN mfg_schedule.source_file; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.mfg_schedule.source_file IS 'Source file name from KBom';


--
-- TOC entry 5117 (class 0 OID 0)
-- Dependencies: 538
-- Name: COLUMN mfg_schedule.est_start_date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.mfg_schedule.est_start_date IS 'Estimated start date for manufacturing';


--
-- TOC entry 5118 (class 0 OID 0)
-- Dependencies: 538
-- Name: COLUMN mfg_schedule.est_completion_date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.mfg_schedule.est_completion_date IS 'Estimated completion date based on work schedule';


--
-- TOC entry 5119 (class 0 OID 0)
-- Dependencies: 538
-- Name: COLUMN mfg_schedule.est_hours; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.mfg_schedule.est_hours IS 'Estimated hours needed for completion';


--
-- TOC entry 5120 (class 0 OID 0)
-- Dependencies: 538
-- Name: COLUMN mfg_schedule.workstation; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.mfg_schedule.workstation IS 'Assigned workstation (Assembly, Machining, Welding, Paint)';


--
-- TOC entry 5121 (class 0 OID 0)
-- Dependencies: 538
-- Name: COLUMN mfg_schedule.sequence_order; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.mfg_schedule.sequence_order IS 'Order sequence within the sales order';


--
-- TOC entry 5122 (class 0 OID 0)
-- Dependencies: 538
-- Name: COLUMN mfg_schedule.kbom_rowid; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.mfg_schedule.kbom_rowid IS 'Reference to KBom table rowid';


--
-- TOC entry 537 (class 1259 OID 17786)
-- Name: mfg_schedule_rowid_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mfg_schedule_rowid_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mfg_schedule_rowid_seq OWNER TO postgres;

--
-- TOC entry 5124 (class 0 OID 0)
-- Dependencies: 537
-- Name: mfg_schedule_rowid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mfg_schedule_rowid_seq OWNED BY public.mfg_schedule.rowid;


--
-- TOC entry 555 (class 1259 OID 27636)
-- Name: milestones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.milestones (
    milestone_id integer NOT NULL,
    project_id integer,
    milestone_name character varying(255) NOT NULL,
    description text,
    due_date date,
    completed_date date,
    status character varying(50) DEFAULT 'Pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(100) DEFAULT CURRENT_USER,
    CONSTRAINT milestones_status_check CHECK (((status)::text = ANY ((ARRAY['Pending'::character varying, 'In Progress'::character varying, 'Completed'::character varying, 'Missed'::character varying])::text[])))
);


ALTER TABLE public.milestones OWNER TO postgres;

--
-- TOC entry 554 (class 1259 OID 27635)
-- Name: milestones_milestone_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.milestones_milestone_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.milestones_milestone_id_seq OWNER TO postgres;

--
-- TOC entry 5126 (class 0 OID 0)
-- Dependencies: 554
-- Name: milestones_milestone_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.milestones_milestone_id_seq OWNED BY public.milestones.milestone_id;


--
-- TOC entry 544 (class 1259 OID 27278)
-- Name: models; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.models (
    id character varying(255) NOT NULL,
    object_id character varying(255),
    file_name character varying(255) NOT NULL,
    display_name character varying(255),
    description text,
    bucket_key character varying(255),
    object_key character varying(255),
    urn character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'uploaded'::character varying,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    tags json,
    category character varying(100),
    error text
);


ALTER TABLE public.models OWNER TO postgres;

--
-- TOC entry 525 (class 1259 OID 17384)
-- Name: part_vendor_map; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.part_vendor_map (
    map_id integer NOT NULL,
    stock_number text NOT NULL,
    vendor_id integer NOT NULL,
    vendor_part_number text,
    unit_cost numeric(10,2),
    sales_price numeric(10,2),
    lead_time_weeks integer,
    mfg_part_number text
);


ALTER TABLE public.part_vendor_map OWNER TO postgres;

--
-- TOC entry 524 (class 1259 OID 17383)
-- Name: part_vendor_map_map_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.part_vendor_map_map_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.part_vendor_map_map_id_seq OWNER TO postgres;

--
-- TOC entry 5129 (class 0 OID 0)
-- Dependencies: 524
-- Name: part_vendor_map_map_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.part_vendor_map_map_id_seq OWNED BY public.part_vendor_map.map_id;


--
-- TOC entry 553 (class 1259 OID 27617)
-- Name: projects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.projects (
    project_id integer NOT NULL,
    project_name character varying(255) NOT NULL,
    so integer,
    source_file character varying(255),
    customer character varying(255),
    description text,
    status character varying(50) DEFAULT 'Planning'::character varying,
    priority character varying(20) DEFAULT 'Medium'::character varying,
    start_date date,
    target_end_date date,
    actual_end_date date,
    progress_percentage integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(100) DEFAULT CURRENT_USER,
    modified_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    modified_by character varying(100) DEFAULT CURRENT_USER,
    CONSTRAINT projects_priority_check CHECK (((priority)::text = ANY ((ARRAY['Low'::character varying, 'Medium'::character varying, 'High'::character varying, 'Critical'::character varying])::text[]))),
    CONSTRAINT projects_progress_check CHECK (((progress_percentage >= 0) AND (progress_percentage <= 100))),
    CONSTRAINT projects_status_check CHECK (((status)::text = ANY ((ARRAY['Planning'::character varying, 'Active'::character varying, 'On Hold'::character varying, 'Completed'::character varying, 'Cancelled'::character varying])::text[])))
);


ALTER TABLE public.projects OWNER TO postgres;

--
-- TOC entry 552 (class 1259 OID 27616)
-- Name: projects_project_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.projects_project_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.projects_project_id_seq OWNER TO postgres;

--
-- TOC entry 5131 (class 0 OID 0)
-- Dependencies: 552
-- Name: projects_project_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.projects_project_id_seq OWNED BY public.projects.project_id;


--
-- TOC entry 567 (class 1259 OID 27801)
-- Name: raw_material_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.raw_material_requests (
    request_id integer NOT NULL,
    raw_material text NOT NULL,
    part_number character varying(100),
    wo_number character varying(100),
    requester character varying(100) NOT NULL,
    requester_notes text,
    purchase_status character varying(50) DEFAULT 'Not Ordered'::character varying,
    eta date,
    purchasing_notes text,
    receive_status character varying(50),
    receiving_notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(100) DEFAULT CURRENT_USER,
    modified_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    modified_by character varying(100) DEFAULT CURRENT_USER,
    CONSTRAINT purchase_status_check CHECK (((purchase_status)::text = ANY ((ARRAY['Not Ordered'::character varying, 'Quoted'::character varying, 'Ordered'::character varying, 'Issue'::character varying])::text[]))),
    CONSTRAINT receive_status_check CHECK (((receive_status IS NULL) OR ((receive_status)::text = ANY ((ARRAY['Received Full'::character varying, 'Received Partial'::character varying])::text[]))))
);


ALTER TABLE public.raw_material_requests OWNER TO postgres;

--
-- TOC entry 566 (class 1259 OID 27800)
-- Name: raw_material_requests_request_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.raw_material_requests_request_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.raw_material_requests_request_id_seq OWNER TO postgres;

--
-- TOC entry 5133 (class 0 OID 0)
-- Dependencies: 566
-- Name: raw_material_requests_request_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.raw_material_requests_request_id_seq OWNED BY public.raw_material_requests.request_id;


--
-- TOC entry 535 (class 1259 OID 17656)
-- Name: receiving_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.receiving_log (
    receiving_id integer NOT NULL,
    kbom_rowid integer,
    received_qty integer NOT NULL,
    received_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    received_by character varying(100) NOT NULL,
    storage_unit_id integer,
    notes text,
    last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    so integer,
    source_file text,
    stock_number character varying(100),
    CONSTRAINT chk_received_qty CHECK ((received_qty >= 0))
);


ALTER TABLE public.receiving_log OWNER TO postgres;

--
-- TOC entry 534 (class 1259 OID 17655)
-- Name: receiving_log_receiving_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.receiving_log_receiving_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.receiving_log_receiving_id_seq OWNER TO postgres;

--
-- TOC entry 5135 (class 0 OID 0)
-- Dependencies: 534
-- Name: receiving_log_receiving_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.receiving_log_receiving_id_seq OWNED BY public.receiving_log.receiving_id;


--
-- TOC entry 569 (class 1259 OID 28005)
-- Name: sales_manifest; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_manifest (
    manifest_id integer NOT NULL,
    manifest_name character varying(255) NOT NULL,
    sales_order_number character varying(50),
    customer character varying(255),
    quote_number character varying(50),
    due_date date,
    created_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(50),
    modified_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    modified_by character varying(50),
    status character varying(50) DEFAULT 'draft'::character varying,
    notes text
);


ALTER TABLE public.sales_manifest OWNER TO postgres;

--
-- TOC entry 571 (class 1259 OID 28017)
-- Name: sales_manifest_sections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_manifest_sections (
    section_id integer NOT NULL,
    manifest_id integer NOT NULL,
    section_name character varying(255) NOT NULL,
    section_order integer NOT NULL,
    created_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(50),
    notes text,
    engineering_approved boolean DEFAULT false,
    engineering_approved_by character varying(50),
    engineering_approved_date timestamp without time zone,
    purchasing_approved boolean DEFAULT false,
    purchasing_approved_by character varying(50),
    purchasing_approved_date timestamp without time zone,
    manufacturing_approved boolean DEFAULT false,
    manufacturing_approved_by character varying(50),
    manufacturing_approved_date timestamp without time zone,
    controls_approved boolean DEFAULT false,
    controls_approved_by character varying(50),
    controls_approved_date timestamp without time zone,
    programming_approved boolean DEFAULT false,
    programming_approved_by character varying(50),
    programming_approved_date timestamp without time zone,
    accounting_approved boolean DEFAULT false,
    accounting_approved_by character varying(50),
    accounting_approved_date timestamp without time zone
);


ALTER TABLE public.sales_manifest_sections OWNER TO postgres;

--
-- TOC entry 578 (class 1259 OID 28206)
-- Name: sales_manifest_approval_status; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.sales_manifest_approval_status AS
 SELECT m.manifest_id,
    m.manifest_name,
    m.sales_order_number,
    m.customer,
    s.section_id,
    s.section_name,
    s.section_order,
    s.engineering_approved,
    s.engineering_approved_by,
    s.engineering_approved_date,
    s.purchasing_approved,
    s.purchasing_approved_by,
    s.purchasing_approved_date,
    s.manufacturing_approved,
    s.manufacturing_approved_by,
    s.manufacturing_approved_date,
    s.controls_approved,
    s.controls_approved_by,
    s.controls_approved_date,
    s.programming_approved,
    s.programming_approved_by,
    s.programming_approved_date,
    s.accounting_approved,
    s.accounting_approved_by,
    s.accounting_approved_date,
        CASE
            WHEN (s.engineering_approved AND s.purchasing_approved AND s.manufacturing_approved AND s.controls_approved AND s.programming_approved AND s.accounting_approved) THEN true
            ELSE false
        END AS all_approvals_complete,
    (((((
        CASE
            WHEN s.engineering_approved THEN 1
            ELSE 0
        END +
        CASE
            WHEN s.purchasing_approved THEN 1
            ELSE 0
        END) +
        CASE
            WHEN s.manufacturing_approved THEN 1
            ELSE 0
        END) +
        CASE
            WHEN s.controls_approved THEN 1
            ELSE 0
        END) +
        CASE
            WHEN s.programming_approved THEN 1
            ELSE 0
        END) +
        CASE
            WHEN s.accounting_approved THEN 1
            ELSE 0
        END) AS approval_count
   FROM (public.sales_manifest m
     JOIN public.sales_manifest_sections s ON ((m.manifest_id = s.manifest_id)))
  ORDER BY m.manifest_id, s.section_order;


ALTER VIEW public.sales_manifest_approval_status OWNER TO postgres;

--
-- TOC entry 573 (class 1259 OID 28032)
-- Name: sales_manifest_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_manifest_items (
    item_id integer NOT NULL,
    section_id integer NOT NULL,
    part_number character varying(100) NOT NULL,
    quantity numeric(10,2) DEFAULT 1 NOT NULL,
    description text,
    cost_each numeric(12,2),
    total_cost numeric(12,2) GENERATED ALWAYS AS ((quantity * cost_each)) STORED,
    tag_number character varying(50),
    item_order integer NOT NULL,
    source_file character varying(255),
    assembly_name character varying(255),
    created_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(50),
    status character varying(50) DEFAULT 'pending'::character varying,
    kbom_load_date timestamp without time zone,
    notes text,
    engineering_cad_released boolean DEFAULT false,
    engineering_cad_released_by character varying(50),
    engineering_cad_released_date timestamp without time zone,
    uploaded_to_mrp boolean DEFAULT false,
    uploaded_to_mrp_by character varying(50),
    uploaded_to_mrp_date timestamp without time zone
);


ALTER TABLE public.sales_manifest_items OWNER TO postgres;

--
-- TOC entry 572 (class 1259 OID 28031)
-- Name: sales_manifest_items_item_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sales_manifest_items_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sales_manifest_items_item_id_seq OWNER TO postgres;

--
-- TOC entry 5140 (class 0 OID 0)
-- Dependencies: 572
-- Name: sales_manifest_items_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sales_manifest_items_item_id_seq OWNED BY public.sales_manifest_items.item_id;


--
-- TOC entry 568 (class 1259 OID 28004)
-- Name: sales_manifest_manifest_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sales_manifest_manifest_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sales_manifest_manifest_id_seq OWNER TO postgres;

--
-- TOC entry 5141 (class 0 OID 0)
-- Dependencies: 568
-- Name: sales_manifest_manifest_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sales_manifest_manifest_id_seq OWNED BY public.sales_manifest.manifest_id;


--
-- TOC entry 575 (class 1259 OID 28061)
-- Name: sales_manifest_parts_part_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sales_manifest_parts_part_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sales_manifest_parts_part_id_seq OWNER TO postgres;

--
-- TOC entry 5142 (class 0 OID 0)
-- Dependencies: 575
-- Name: sales_manifest_parts_part_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sales_manifest_parts_part_id_seq OWNED BY public.sales_manifest_parts.part_id;


--
-- TOC entry 570 (class 1259 OID 28016)
-- Name: sales_manifest_sections_section_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sales_manifest_sections_section_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sales_manifest_sections_section_id_seq OWNER TO postgres;

--
-- TOC entry 5143 (class 0 OID 0)
-- Dependencies: 570
-- Name: sales_manifest_sections_section_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sales_manifest_sections_section_id_seq OWNED BY public.sales_manifest_sections.section_id;


--
-- TOC entry 574 (class 1259 OID 28056)
-- Name: sales_manifest_view; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.sales_manifest_view AS
 SELECT m.manifest_id,
    m.manifest_name,
    m.sales_order_number,
    m.customer,
    m.quote_number,
    m.due_date,
    m.status AS manifest_status,
    s.section_id,
    s.section_name,
    s.section_order,
    i.item_id,
    i.part_number,
    i.quantity,
    i.description,
    i.cost_each,
    i.total_cost,
    i.tag_number,
    i.source_file,
    i.assembly_name,
    i.item_order,
    i.status AS item_status,
    i.kbom_load_date,
    i.engineering_cad_released,
    i.engineering_cad_released_by,
    i.engineering_cad_released_date,
    i.uploaded_to_mrp,
    i.uploaded_to_mrp_by,
    i.uploaded_to_mrp_date
   FROM ((public.sales_manifest m
     LEFT JOIN public.sales_manifest_sections s ON ((m.manifest_id = s.manifest_id)))
     LEFT JOIN public.sales_manifest_items i ON ((s.section_id = i.section_id)))
  ORDER BY m.manifest_id, s.section_order, i.item_order;


ALTER VIEW public.sales_manifest_view OWNER TO postgres;

--
-- TOC entry 527 (class 1259 OID 17600)
-- Name: shops; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shops (
    shop_id integer NOT NULL,
    shop_name character varying(255) NOT NULL,
    address text,
    last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.shops OWNER TO postgres;

--
-- TOC entry 526 (class 1259 OID 17599)
-- Name: shops_shop_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.shops_shop_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.shops_shop_id_seq OWNER TO postgres;

--
-- TOC entry 5146 (class 0 OID 0)
-- Dependencies: 526
-- Name: shops_shop_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.shops_shop_id_seq OWNED BY public.shops.shop_id;


--
-- TOC entry 529 (class 1259 OID 17610)
-- Name: storage_units; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.storage_units (
    storage_unit_id integer NOT NULL,
    shop_id integer NOT NULL,
    storage_type character varying(50) NOT NULL,
    identifier character varying(100) NOT NULL,
    description text,
    last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.storage_units OWNER TO postgres;

--
-- TOC entry 528 (class 1259 OID 17609)
-- Name: storage_units_storage_unit_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.storage_units_storage_unit_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.storage_units_storage_unit_id_seq OWNER TO postgres;

--
-- TOC entry 5148 (class 0 OID 0)
-- Dependencies: 528
-- Name: storage_units_storage_unit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.storage_units_storage_unit_id_seq OWNED BY public.storage_units.storage_unit_id;


--
-- TOC entry 550 (class 1259 OID 27551)
-- Name: tab_access; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tab_access (
    access_id integer NOT NULL,
    group_id integer,
    tab_name character varying(100) NOT NULL,
    can_access boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.tab_access OWNER TO postgres;

--
-- TOC entry 549 (class 1259 OID 27550)
-- Name: tab_access_access_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tab_access_access_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tab_access_access_id_seq OWNER TO postgres;

--
-- TOC entry 5150 (class 0 OID 0)
-- Dependencies: 549
-- Name: tab_access_access_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tab_access_access_id_seq OWNED BY public.tab_access.access_id;


--
-- TOC entry 563 (class 1259 OID 27731)
-- Name: task_attachments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.task_attachments (
    attachment_id integer NOT NULL,
    task_id integer,
    file_name character varying(255) NOT NULL,
    file_path text,
    file_size integer,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    uploaded_by character varying(100) DEFAULT CURRENT_USER
);


ALTER TABLE public.task_attachments OWNER TO postgres;

--
-- TOC entry 562 (class 1259 OID 27730)
-- Name: task_attachments_attachment_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.task_attachments_attachment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.task_attachments_attachment_id_seq OWNER TO postgres;

--
-- TOC entry 5152 (class 0 OID 0)
-- Dependencies: 562
-- Name: task_attachments_attachment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.task_attachments_attachment_id_seq OWNED BY public.task_attachments.attachment_id;


--
-- TOC entry 561 (class 1259 OID 27715)
-- Name: task_comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.task_comments (
    comment_id integer NOT NULL,
    task_id integer,
    comment_text text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(100) DEFAULT CURRENT_USER
);


ALTER TABLE public.task_comments OWNER TO postgres;

--
-- TOC entry 560 (class 1259 OID 27714)
-- Name: task_comments_comment_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.task_comments_comment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.task_comments_comment_id_seq OWNER TO postgres;

--
-- TOC entry 5154 (class 0 OID 0)
-- Dependencies: 560
-- Name: task_comments_comment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.task_comments_comment_id_seq OWNED BY public.task_comments.comment_id;


--
-- TOC entry 559 (class 1259 OID 27690)
-- Name: task_dependencies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.task_dependencies (
    dependency_id integer NOT NULL,
    task_id integer,
    depends_on_task_id integer,
    dependency_type character varying(20) DEFAULT 'FS'::character varying,
    lag_days integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(100) DEFAULT CURRENT_USER,
    CONSTRAINT dependency_type_check CHECK (((dependency_type)::text = ANY ((ARRAY['FS'::character varying, 'FF'::character varying, 'SS'::character varying, 'SF'::character varying])::text[]))),
    CONSTRAINT task_dependencies_no_self CHECK ((task_id <> depends_on_task_id))
);


ALTER TABLE public.task_dependencies OWNER TO postgres;

--
-- TOC entry 558 (class 1259 OID 27689)
-- Name: task_dependencies_dependency_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.task_dependencies_dependency_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.task_dependencies_dependency_id_seq OWNER TO postgres;

--
-- TOC entry 5156 (class 0 OID 0)
-- Dependencies: 558
-- Name: task_dependencies_dependency_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.task_dependencies_dependency_id_seq OWNED BY public.task_dependencies.dependency_id;


--
-- TOC entry 557 (class 1259 OID 27654)
-- Name: tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tasks (
    task_id integer NOT NULL,
    project_id integer,
    milestone_id integer,
    parent_task_id integer,
    task_name character varying(255) NOT NULL,
    description text,
    task_type character varying(50) DEFAULT 'General'::character varying,
    assigned_to character varying(100),
    start_date date,
    due_date date,
    completed_date date,
    estimated_hours numeric(10,2),
    actual_hours numeric(10,2),
    status character varying(50) DEFAULT 'Not Started'::character varying,
    priority character varying(20) DEFAULT 'Medium'::character varying,
    progress_percentage integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(100) DEFAULT CURRENT_USER,
    modified_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    modified_by character varying(100) DEFAULT CURRENT_USER,
    CONSTRAINT tasks_priority_check CHECK (((priority)::text = ANY ((ARRAY['Low'::character varying, 'Medium'::character varying, 'High'::character varying, 'Critical'::character varying])::text[]))),
    CONSTRAINT tasks_progress_check CHECK (((progress_percentage >= 0) AND (progress_percentage <= 100))),
    CONSTRAINT tasks_status_check CHECK (((status)::text = ANY ((ARRAY['Not Started'::character varying, 'In Progress'::character varying, 'Completed'::character varying, 'Cancelled'::character varying, 'Blocked'::character varying, 'On Hold'::character varying])::text[]))),
    CONSTRAINT tasks_type_check CHECK (((task_type)::text = ANY ((ARRAY['General'::character varying, 'Manufacturing'::character varying, 'Installation'::character varying, 'Shipment'::character varying, 'Quality Check'::character varying, 'Documentation'::character varying, 'Review'::character varying, 'Approval'::character varying])::text[])))
);


ALTER TABLE public.tasks OWNER TO postgres;

--
-- TOC entry 556 (class 1259 OID 27653)
-- Name: tasks_task_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tasks_task_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tasks_task_id_seq OWNER TO postgres;

--
-- TOC entry 5158 (class 0 OID 0)
-- Dependencies: 556
-- Name: tasks_task_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tasks_task_id_seq OWNED BY public.tasks.task_id;


--
-- TOC entry 548 (class 1259 OID 27534)
-- Name: user_group_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_group_members (
    member_id integer NOT NULL,
    username character varying(100) NOT NULL,
    group_id integer,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    assigned_by character varying(100) DEFAULT CURRENT_USER
);


ALTER TABLE public.user_group_members OWNER TO postgres;

--
-- TOC entry 547 (class 1259 OID 27533)
-- Name: user_group_members_member_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_group_members_member_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_group_members_member_id_seq OWNER TO postgres;

--
-- TOC entry 5160 (class 0 OID 0)
-- Dependencies: 547
-- Name: user_group_members_member_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_group_members_member_id_seq OWNED BY public.user_group_members.member_id;


--
-- TOC entry 546 (class 1259 OID 27521)
-- Name: user_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_groups (
    group_id integer NOT NULL,
    group_name character varying(100) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(100) DEFAULT CURRENT_USER
);


ALTER TABLE public.user_groups OWNER TO postgres;

--
-- TOC entry 545 (class 1259 OID 27520)
-- Name: user_groups_group_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_groups_group_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_groups_group_id_seq OWNER TO postgres;

--
-- TOC entry 5162 (class 0 OID 0)
-- Dependencies: 545
-- Name: user_groups_group_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_groups_group_id_seq OWNED BY public.user_groups.group_id;


--
-- TOC entry 521 (class 1259 OID 16450)
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_preferences (
    username character varying(50) NOT NULL,
    module_name character varying(50) NOT NULL,
    columns_selected text,
    column_layout text,
    slicers_selected text,
    preference_key character varying(50),
    value text,
    modified_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    mfg_colors_enabled boolean DEFAULT false
);


ALTER TABLE public.user_preferences OWNER TO postgres;

--
-- TOC entry 551 (class 1259 OID 27567)
-- Name: user_tab_access; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.user_tab_access AS
 SELECT DISTINCT ugm.username,
    ta.tab_name,
    bool_or(ta.can_access) AS can_access
   FROM (public.user_group_members ugm
     JOIN public.tab_access ta ON ((ugm.group_id = ta.group_id)))
  GROUP BY ugm.username, ta.tab_name;


ALTER VIEW public.user_tab_access OWNER TO postgres;

--
-- TOC entry 565 (class 1259 OID 27763)
-- Name: v_task_dependencies; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_task_dependencies AS
 SELECT td.dependency_id,
    td.task_id,
    t1.task_name,
    td.depends_on_task_id,
    t2.task_name AS depends_on_task_name,
    td.dependency_type,
    td.lag_days,
    t1.status AS task_status,
    t2.status AS depends_on_status
   FROM ((public.task_dependencies td
     JOIN public.tasks t1 ON ((td.task_id = t1.task_id)))
     JOIN public.tasks t2 ON ((td.depends_on_task_id = t2.task_id)));


ALTER VIEW public.v_task_dependencies OWNER TO postgres;

--
-- TOC entry 564 (class 1259 OID 27758)
-- Name: v_task_details; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_task_details AS
 SELECT t.task_id,
    t.task_name,
    t.description,
    t.task_type,
    t.assigned_to,
    t.start_date,
    t.due_date,
    t.completed_date,
    t.estimated_hours,
    t.actual_hours,
    t.status,
    t.priority,
    t.progress_percentage,
    p.project_id,
    p.project_name,
    p.so,
    p.source_file,
    p.customer,
    m.milestone_id,
    m.milestone_name,
    m.due_date AS milestone_due_date
   FROM ((public.tasks t
     JOIN public.projects p ON ((t.project_id = p.project_id)))
     LEFT JOIN public.milestones m ON ((t.milestone_id = m.milestone_id)));


ALTER VIEW public.v_task_details OWNER TO postgres;

--
-- TOC entry 523 (class 1259 OID 17374)
-- Name: vendors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vendors (
    vendor_id integer NOT NULL,
    vendor_name text NOT NULL,
    vendor_number text,
    contact text,
    address text,
    city text,
    state text,
    phone text,
    email_address text,
    website text
);


ALTER TABLE public.vendors OWNER TO postgres;

--
-- TOC entry 522 (class 1259 OID 17373)
-- Name: vendors_vendor_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.vendors_vendor_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vendors_vendor_id_seq OWNER TO postgres;

--
-- TOC entry 5166 (class 0 OID 0)
-- Dependencies: 522
-- Name: vendors_vendor_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.vendors_vendor_id_seq OWNED BY public.vendors.vendor_id;


--
-- TOC entry 4671 (class 2604 OID 25976)
-- Name: bom_header bom_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bom_header ALTER COLUMN bom_id SET DEFAULT nextval('public.bom_header_bom_id_seq'::regclass);


--
-- TOC entry 4673 (class 2604 OID 25991)
-- Name: bom_line line_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bom_line ALTER COLUMN line_id SET DEFAULT nextval('public.bom_line_line_id_seq'::regclass);


--
-- TOC entry 4660 (class 2604 OID 17628)
-- Name: inventory_items item_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_items ALTER COLUMN item_id SET DEFAULT nextval('public.inventory_items_item_id_seq'::regclass);


--
-- TOC entry 4662 (class 2604 OID 17640)
-- Name: inventory_storage inventory_storage_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_storage ALTER COLUMN inventory_storage_id SET DEFAULT nextval('public.inventory_storage_inventory_storage_id_seq'::regclass);


--
-- TOC entry 4646 (class 2604 OID 16444)
-- Name: kbom rowid; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kbom ALTER COLUMN rowid SET DEFAULT nextval('public.kbom_rowid_seq'::regclass);


--
-- TOC entry 4752 (class 2604 OID 28287)
-- Name: kbom_daily_changes change_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kbom_daily_changes ALTER COLUMN change_id SET DEFAULT nextval('public.kbom_daily_changes_change_id_seq'::regclass);


--
-- TOC entry 4748 (class 2604 OID 28271)
-- Name: kbom_history_snapshots snapshot_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kbom_history_snapshots ALTER COLUMN snapshot_id SET DEFAULT nextval('public.kbom_history_snapshots_snapshot_id_seq'::regclass);


--
-- TOC entry 4668 (class 2604 OID 17790)
-- Name: mfg_schedule rowid; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mfg_schedule ALTER COLUMN rowid SET DEFAULT nextval('public.mfg_schedule_rowid_seq'::regclass);


--
-- TOC entry 4695 (class 2604 OID 27639)
-- Name: milestones milestone_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.milestones ALTER COLUMN milestone_id SET DEFAULT nextval('public.milestones_milestone_id_seq'::regclass);


--
-- TOC entry 4655 (class 2604 OID 17387)
-- Name: part_vendor_map map_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.part_vendor_map ALTER COLUMN map_id SET DEFAULT nextval('public.part_vendor_map_map_id_seq'::regclass);


--
-- TOC entry 4687 (class 2604 OID 27620)
-- Name: projects project_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects ALTER COLUMN project_id SET DEFAULT nextval('public.projects_project_id_seq'::regclass);


--
-- TOC entry 4719 (class 2604 OID 27804)
-- Name: raw_material_requests request_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.raw_material_requests ALTER COLUMN request_id SET DEFAULT nextval('public.raw_material_requests_request_id_seq'::regclass);


--
-- TOC entry 4665 (class 2604 OID 17659)
-- Name: receiving_log receiving_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receiving_log ALTER COLUMN receiving_id SET DEFAULT nextval('public.receiving_log_receiving_id_seq'::regclass);


--
-- TOC entry 4725 (class 2604 OID 28008)
-- Name: sales_manifest manifest_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_manifest ALTER COLUMN manifest_id SET DEFAULT nextval('public.sales_manifest_manifest_id_seq'::regclass);


--
-- TOC entry 4737 (class 2604 OID 28035)
-- Name: sales_manifest_items item_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_manifest_items ALTER COLUMN item_id SET DEFAULT nextval('public.sales_manifest_items_item_id_seq'::regclass);


--
-- TOC entry 4744 (class 2604 OID 28065)
-- Name: sales_manifest_parts part_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_manifest_parts ALTER COLUMN part_id SET DEFAULT nextval('public.sales_manifest_parts_part_id_seq'::regclass);


--
-- TOC entry 4729 (class 2604 OID 28020)
-- Name: sales_manifest_sections section_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_manifest_sections ALTER COLUMN section_id SET DEFAULT nextval('public.sales_manifest_sections_section_id_seq'::regclass);


--
-- TOC entry 4656 (class 2604 OID 17603)
-- Name: shops shop_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shops ALTER COLUMN shop_id SET DEFAULT nextval('public.shops_shop_id_seq'::regclass);


--
-- TOC entry 4658 (class 2604 OID 17613)
-- Name: storage_units storage_unit_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_units ALTER COLUMN storage_unit_id SET DEFAULT nextval('public.storage_units_storage_unit_id_seq'::regclass);


--
-- TOC entry 4683 (class 2604 OID 27554)
-- Name: tab_access access_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tab_access ALTER COLUMN access_id SET DEFAULT nextval('public.tab_access_access_id_seq'::regclass);


--
-- TOC entry 4716 (class 2604 OID 27734)
-- Name: task_attachments attachment_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_attachments ALTER COLUMN attachment_id SET DEFAULT nextval('public.task_attachments_attachment_id_seq'::regclass);


--
-- TOC entry 4713 (class 2604 OID 27718)
-- Name: task_comments comment_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_comments ALTER COLUMN comment_id SET DEFAULT nextval('public.task_comments_comment_id_seq'::regclass);


--
-- TOC entry 4708 (class 2604 OID 27693)
-- Name: task_dependencies dependency_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_dependencies ALTER COLUMN dependency_id SET DEFAULT nextval('public.task_dependencies_dependency_id_seq'::regclass);


--
-- TOC entry 4699 (class 2604 OID 27657)
-- Name: tasks task_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks ALTER COLUMN task_id SET DEFAULT nextval('public.tasks_task_id_seq'::regclass);


--
-- TOC entry 4680 (class 2604 OID 27537)
-- Name: user_group_members member_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_group_members ALTER COLUMN member_id SET DEFAULT nextval('public.user_group_members_member_id_seq'::regclass);


--
-- TOC entry 4677 (class 2604 OID 27524)
-- Name: user_groups group_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_groups ALTER COLUMN group_id SET DEFAULT nextval('public.user_groups_group_id_seq'::regclass);


--
-- TOC entry 4654 (class 2604 OID 17377)
-- Name: vendors vendor_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendors ALTER COLUMN vendor_id SET DEFAULT nextval('public.vendors_vendor_id_seq'::regclass);


--
-- TOC entry 4811 (class 2606 OID 17785)
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (setting_name);


--
-- TOC entry 4819 (class 2606 OID 25981)
-- Name: bom_header bom_header_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bom_header
    ADD CONSTRAINT bom_header_pkey PRIMARY KEY (bom_id);


--
-- TOC entry 4821 (class 2606 OID 25995)
-- Name: bom_line bom_line_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bom_line
    ADD CONSTRAINT bom_line_pkey PRIMARY KEY (line_id);


--
-- TOC entry 4801 (class 2606 OID 17633)
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (item_id);


--
-- TOC entry 4803 (class 2606 OID 17635)
-- Name: inventory_items inventory_items_stock_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_stock_number_key UNIQUE (stock_number);


--
-- TOC entry 4806 (class 2606 OID 17644)
-- Name: inventory_storage inventory_storage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_storage
    ADD CONSTRAINT inventory_storage_pkey PRIMARY KEY (inventory_storage_id);


--
-- TOC entry 4817 (class 2606 OID 24699)
-- Name: item_master item_master_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item_master
    ADD CONSTRAINT item_master_pkey PRIMARY KEY (stock_number);


--
-- TOC entry 4900 (class 2606 OID 28292)
-- Name: kbom_daily_changes kbom_daily_changes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kbom_daily_changes
    ADD CONSTRAINT kbom_daily_changes_pkey PRIMARY KEY (change_id);


--
-- TOC entry 4896 (class 2606 OID 28278)
-- Name: kbom_history_snapshots kbom_history_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kbom_history_snapshots
    ADD CONSTRAINT kbom_history_snapshots_pkey PRIMARY KEY (snapshot_id);


--
-- TOC entry 4785 (class 2606 OID 16448)
-- Name: kbom kbom_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kbom
    ADD CONSTRAINT kbom_pkey PRIMARY KEY (rowid);


--
-- TOC entry 4813 (class 2606 OID 17796)
-- Name: mfg_schedule mfg_schedule_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mfg_schedule
    ADD CONSTRAINT mfg_schedule_pkey PRIMARY KEY (rowid);


--
-- TOC entry 4842 (class 2606 OID 27647)
-- Name: milestones milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_pkey PRIMARY KEY (milestone_id);


--
-- TOC entry 4823 (class 2606 OID 27286)
-- Name: models models_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.models
    ADD CONSTRAINT models_pkey PRIMARY KEY (id);


--
-- TOC entry 4793 (class 2606 OID 17391)
-- Name: part_vendor_map part_vendor_map_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.part_vendor_map
    ADD CONSTRAINT part_vendor_map_pkey PRIMARY KEY (map_id);


--
-- TOC entry 4795 (class 2606 OID 17393)
-- Name: part_vendor_map part_vendor_map_stock_number_vendor_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.part_vendor_map
    ADD CONSTRAINT part_vendor_map_stock_number_vendor_id_key UNIQUE (stock_number, vendor_id);


--
-- TOC entry 4840 (class 2606 OID 27634)
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (project_id);


--
-- TOC entry 4863 (class 2606 OID 27815)
-- Name: raw_material_requests raw_material_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.raw_material_requests
    ADD CONSTRAINT raw_material_requests_pkey PRIMARY KEY (request_id);


--
-- TOC entry 4809 (class 2606 OID 17666)
-- Name: receiving_log receiving_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receiving_log
    ADD CONSTRAINT receiving_log_pkey PRIMARY KEY (receiving_id);


--
-- TOC entry 4884 (class 2606 OID 28043)
-- Name: sales_manifest_items sales_manifest_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_manifest_items
    ADD CONSTRAINT sales_manifest_items_pkey PRIMARY KEY (item_id);


--
-- TOC entry 4889 (class 2606 OID 28074)
-- Name: sales_manifest_parts sales_manifest_parts_part_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_manifest_parts
    ADD CONSTRAINT sales_manifest_parts_part_number_key UNIQUE (part_number);


--
-- TOC entry 4891 (class 2606 OID 28072)
-- Name: sales_manifest_parts sales_manifest_parts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_manifest_parts
    ADD CONSTRAINT sales_manifest_parts_pkey PRIMARY KEY (part_id);


--
-- TOC entry 4868 (class 2606 OID 28015)
-- Name: sales_manifest sales_manifest_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_manifest
    ADD CONSTRAINT sales_manifest_pkey PRIMARY KEY (manifest_id);


--
-- TOC entry 4877 (class 2606 OID 28025)
-- Name: sales_manifest_sections sales_manifest_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_manifest_sections
    ADD CONSTRAINT sales_manifest_sections_pkey PRIMARY KEY (section_id);


--
-- TOC entry 4797 (class 2606 OID 17608)
-- Name: shops shops_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shops
    ADD CONSTRAINT shops_pkey PRIMARY KEY (shop_id);


--
-- TOC entry 4799 (class 2606 OID 17618)
-- Name: storage_units storage_units_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_units
    ADD CONSTRAINT storage_units_pkey PRIMARY KEY (storage_unit_id);


--
-- TOC entry 4833 (class 2606 OID 27561)
-- Name: tab_access tab_access_group_id_tab_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tab_access
    ADD CONSTRAINT tab_access_group_id_tab_name_key UNIQUE (group_id, tab_name);


--
-- TOC entry 4835 (class 2606 OID 27559)
-- Name: tab_access tab_access_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tab_access
    ADD CONSTRAINT tab_access_pkey PRIMARY KEY (access_id);


--
-- TOC entry 4858 (class 2606 OID 27740)
-- Name: task_attachments task_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_attachments
    ADD CONSTRAINT task_attachments_pkey PRIMARY KEY (attachment_id);


--
-- TOC entry 4856 (class 2606 OID 27724)
-- Name: task_comments task_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_pkey PRIMARY KEY (comment_id);


--
-- TOC entry 4852 (class 2606 OID 27701)
-- Name: task_dependencies task_dependencies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_dependencies
    ADD CONSTRAINT task_dependencies_pkey PRIMARY KEY (dependency_id);


--
-- TOC entry 4854 (class 2606 OID 27703)
-- Name: task_dependencies task_dependencies_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_dependencies
    ADD CONSTRAINT task_dependencies_unique UNIQUE (task_id, depends_on_task_id);


--
-- TOC entry 4848 (class 2606 OID 27673)
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (task_id);


--
-- TOC entry 4815 (class 2606 OID 17798)
-- Name: mfg_schedule unique_schedule; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mfg_schedule
    ADD CONSTRAINT unique_schedule UNIQUE (so, source_file);


--
-- TOC entry 4787 (class 2606 OID 17803)
-- Name: user_preferences unique_user_pref; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT unique_user_pref UNIQUE (username, preference_key);


--
-- TOC entry 4829 (class 2606 OID 27541)
-- Name: user_group_members user_group_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_group_members
    ADD CONSTRAINT user_group_members_pkey PRIMARY KEY (member_id);


--
-- TOC entry 4831 (class 2606 OID 27543)
-- Name: user_group_members user_group_members_username_group_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_group_members
    ADD CONSTRAINT user_group_members_username_group_id_key UNIQUE (username, group_id);


--
-- TOC entry 4825 (class 2606 OID 27532)
-- Name: user_groups user_groups_group_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_groups
    ADD CONSTRAINT user_groups_group_name_key UNIQUE (group_name);


--
-- TOC entry 4827 (class 2606 OID 27530)
-- Name: user_groups user_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_groups
    ADD CONSTRAINT user_groups_pkey PRIMARY KEY (group_id);


--
-- TOC entry 4789 (class 2606 OID 16456)
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (username, module_name);


--
-- TOC entry 4791 (class 2606 OID 17381)
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (vendor_id);


--
-- TOC entry 4897 (class 1259 OID 28293)
-- Name: idx_daily_changes_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_changes_date ON public.kbom_daily_changes USING btree (change_date);


--
-- TOC entry 4898 (class 1259 OID 28294)
-- Name: idx_daily_changes_so_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_changes_so_source ON public.kbom_daily_changes USING btree (so, source_file);


--
-- TOC entry 4892 (class 1259 OID 28281)
-- Name: idx_history_customer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_history_customer ON public.kbom_history_snapshots USING btree (customer);


--
-- TOC entry 4893 (class 1259 OID 28279)
-- Name: idx_history_snapshot_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_history_snapshot_date ON public.kbom_history_snapshots USING btree (snapshot_date);


--
-- TOC entry 4894 (class 1259 OID 28280)
-- Name: idx_history_so_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_history_so_source ON public.kbom_history_snapshots USING btree (so, source_file);


--
-- TOC entry 4804 (class 1259 OID 17739)
-- Name: idx_inventory_storage_item_location; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_storage_item_location ON public.inventory_storage USING btree (item_id, storage_unit_id);


--
-- TOC entry 4878 (class 1259 OID 28054)
-- Name: idx_item_part; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_item_part ON public.sales_manifest_items USING btree (part_number);


--
-- TOC entry 4879 (class 1259 OID 28053)
-- Name: idx_item_section; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_item_section ON public.sales_manifest_items USING btree (section_id);


--
-- TOC entry 4880 (class 1259 OID 28055)
-- Name: idx_item_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_item_status ON public.sales_manifest_items USING btree (status);


--
-- TOC entry 4776 (class 1259 OID 16530)
-- Name: idx_kbom_assembly_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kbom_assembly_status ON public.kbom USING btree (assembly_status) WITH (deduplicate_items='true');


--
-- TOC entry 4777 (class 1259 OID 16534)
-- Name: idx_kbom_customer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kbom_customer ON public.kbom USING btree (customer) WITH (deduplicate_items='true');


--
-- TOC entry 4778 (class 1259 OID 16532)
-- Name: idx_kbom_order_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kbom_order_status ON public.kbom USING btree (order_status) WITH (deduplicate_items='true');


--
-- TOC entry 4779 (class 1259 OID 16531)
-- Name: idx_kbom_part_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kbom_part_type ON public.kbom USING btree (part_type) WITH (deduplicate_items='true');


--
-- TOC entry 4780 (class 1259 OID 16533)
-- Name: idx_kbom_receive_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kbom_receive_status ON public.kbom USING btree (receive_status) WITH (deduplicate_items='true');


--
-- TOC entry 4781 (class 1259 OID 16595)
-- Name: idx_kbom_so; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kbom_so ON public.kbom USING btree (so) INCLUDE (so) WITH (deduplicate_items='true');


--
-- TOC entry 4782 (class 1259 OID 16567)
-- Name: idx_kbom_title; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kbom_title ON public.kbom USING btree (title) WITH (deduplicate_items='true');


--
-- TOC entry 4783 (class 1259 OID 16535)
-- Name: idx_kbom_vendor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kbom_vendor ON public.kbom USING btree (vendor) WITH (deduplicate_items='true');


--
-- TOC entry 4864 (class 1259 OID 28050)
-- Name: idx_manifest_customer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_manifest_customer ON public.sales_manifest USING btree (customer);


--
-- TOC entry 4881 (class 1259 OID 28215)
-- Name: idx_manifest_items_cad_released; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_manifest_items_cad_released ON public.sales_manifest_items USING btree (engineering_cad_released);


--
-- TOC entry 4882 (class 1259 OID 28216)
-- Name: idx_manifest_items_mrp_uploaded; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_manifest_items_mrp_uploaded ON public.sales_manifest_items USING btree (uploaded_to_mrp);


--
-- TOC entry 4885 (class 1259 OID 28077)
-- Name: idx_manifest_parts_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_manifest_parts_active ON public.sales_manifest_parts USING btree (active);


--
-- TOC entry 4886 (class 1259 OID 28076)
-- Name: idx_manifest_parts_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_manifest_parts_category ON public.sales_manifest_parts USING btree (category);


--
-- TOC entry 4887 (class 1259 OID 28075)
-- Name: idx_manifest_parts_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_manifest_parts_number ON public.sales_manifest_parts USING btree (part_number);


--
-- TOC entry 4865 (class 1259 OID 28049)
-- Name: idx_manifest_so; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_manifest_so ON public.sales_manifest USING btree (sales_order_number);


--
-- TOC entry 4866 (class 1259 OID 28051)
-- Name: idx_manifest_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_manifest_status ON public.sales_manifest USING btree (status);


--
-- TOC entry 4836 (class 1259 OID 27746)
-- Name: idx_projects_so; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projects_so ON public.projects USING btree (so);


--
-- TOC entry 4837 (class 1259 OID 27747)
-- Name: idx_projects_source_file; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projects_source_file ON public.projects USING btree (source_file);


--
-- TOC entry 4838 (class 1259 OID 27748)
-- Name: idx_projects_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projects_status ON public.projects USING btree (status);


--
-- TOC entry 4859 (class 1259 OID 27817)
-- Name: idx_raw_material_requests_requester; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_raw_material_requests_requester ON public.raw_material_requests USING btree (requester);


--
-- TOC entry 4860 (class 1259 OID 27818)
-- Name: idx_raw_material_requests_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_raw_material_requests_status ON public.raw_material_requests USING btree (purchase_status, receive_status);


--
-- TOC entry 4861 (class 1259 OID 27816)
-- Name: idx_raw_material_requests_wo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_raw_material_requests_wo ON public.raw_material_requests USING btree (wo_number);


--
-- TOC entry 4807 (class 1259 OID 17738)
-- Name: idx_receiving_log_kbom_rowid; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_receiving_log_kbom_rowid ON public.receiving_log USING btree (kbom_rowid);


--
-- TOC entry 4869 (class 1259 OID 28205)
-- Name: idx_section_accounting_approved; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_section_accounting_approved ON public.sales_manifest_sections USING btree (accounting_approved);


--
-- TOC entry 4870 (class 1259 OID 28203)
-- Name: idx_section_controls_approved; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_section_controls_approved ON public.sales_manifest_sections USING btree (controls_approved);


--
-- TOC entry 4871 (class 1259 OID 28200)
-- Name: idx_section_engineering_approved; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_section_engineering_approved ON public.sales_manifest_sections USING btree (engineering_approved);


--
-- TOC entry 4872 (class 1259 OID 28052)
-- Name: idx_section_manifest; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_section_manifest ON public.sales_manifest_sections USING btree (manifest_id);


--
-- TOC entry 4873 (class 1259 OID 28202)
-- Name: idx_section_manufacturing_approved; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_section_manufacturing_approved ON public.sales_manifest_sections USING btree (manufacturing_approved);


--
-- TOC entry 4874 (class 1259 OID 28204)
-- Name: idx_section_programming_approved; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_section_programming_approved ON public.sales_manifest_sections USING btree (programming_approved);


--
-- TOC entry 4875 (class 1259 OID 28201)
-- Name: idx_section_purchasing_approved; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_section_purchasing_approved ON public.sales_manifest_sections USING btree (purchasing_approved);


--
-- TOC entry 4849 (class 1259 OID 27754)
-- Name: idx_task_dependencies_depends; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_task_dependencies_depends ON public.task_dependencies USING btree (depends_on_task_id);


--
-- TOC entry 4850 (class 1259 OID 27753)
-- Name: idx_task_dependencies_task; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_task_dependencies_task ON public.task_dependencies USING btree (task_id);


--
-- TOC entry 4843 (class 1259 OID 27751)
-- Name: idx_tasks_assigned_to; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_assigned_to ON public.tasks USING btree (assigned_to);


--
-- TOC entry 4844 (class 1259 OID 27750)
-- Name: idx_tasks_milestone_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_milestone_id ON public.tasks USING btree (milestone_id);


--
-- TOC entry 4845 (class 1259 OID 27749)
-- Name: idx_tasks_project_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_project_id ON public.tasks USING btree (project_id);


--
-- TOC entry 4846 (class 1259 OID 27752)
-- Name: idx_tasks_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);


--
-- TOC entry 4926 (class 2620 OID 17766)
-- Name: inventory_storage inventory_storage_manual_adjustment_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER inventory_storage_manual_adjustment_trigger AFTER INSERT OR UPDATE ON public.inventory_storage FOR EACH ROW EXECUTE FUNCTION public.log_manual_inventory_adjustment();


--
-- TOC entry 4923 (class 2620 OID 17145)
-- Name: kbom kbom_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER kbom_audit_trigger BEFORE INSERT OR UPDATE ON public.kbom FOR EACH ROW EXECUTE FUNCTION public.kbom_audit_columns();


--
-- TOC entry 4928 (class 2620 OID 17767)
-- Name: receiving_log trig_add_item_to_inventory; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trig_add_item_to_inventory AFTER INSERT ON public.receiving_log FOR EACH ROW EXECUTE FUNCTION public.add_item_to_inventory_if_missing();


--
-- TOC entry 4929 (class 2620 OID 17768)
-- Name: receiving_log trig_fill_receiving_log_fields; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trig_fill_receiving_log_fields AFTER INSERT ON public.receiving_log FOR EACH ROW EXECUTE FUNCTION public.fill_receiving_log_fields();


--
-- TOC entry 4924 (class 2620 OID 17717)
-- Name: kbom trig_pull_inventory_on_kitted; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trig_pull_inventory_on_kitted AFTER UPDATE OF receive_status ON public.kbom FOR EACH ROW WHEN ((new.receive_status = 'received & kitted'::text)) EXECUTE FUNCTION public.pull_inventory_on_kitted();

ALTER TABLE public.kbom DISABLE TRIGGER trig_pull_inventory_on_kitted;


--
-- TOC entry 4930 (class 2620 OID 17769)
-- Name: receiving_log trig_update_kbom_status; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trig_update_kbom_status AFTER INSERT OR DELETE OR UPDATE ON public.receiving_log FOR EACH ROW EXECUTE FUNCTION public.update_kbom_receive_status();


--
-- TOC entry 4931 (class 2620 OID 17773)
-- Name: receiving_log update_kbom_qty_on_hand_receiving_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_kbom_qty_on_hand_receiving_trigger AFTER INSERT OR DELETE OR UPDATE ON public.receiving_log FOR EACH ROW EXECUTE FUNCTION public.update_kbom_qty_on_hand();


--
-- TOC entry 4927 (class 2620 OID 17772)
-- Name: inventory_storage update_kbom_qty_on_hand_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_kbom_qty_on_hand_trigger AFTER INSERT OR DELETE OR UPDATE ON public.inventory_storage FOR EACH ROW EXECUTE FUNCTION public.update_kbom_qty_on_hand();


--
-- TOC entry 4932 (class 2620 OID 17800)
-- Name: mfg_schedule update_mfg_schedule_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_mfg_schedule_updated_at BEFORE UPDATE ON public.mfg_schedule FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4933 (class 2620 OID 27756)
-- Name: projects update_projects_modified; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_projects_modified BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- TOC entry 4935 (class 2620 OID 27820)
-- Name: raw_material_requests update_raw_material_requests_modtime; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_raw_material_requests_modtime BEFORE UPDATE ON public.raw_material_requests FOR EACH ROW EXECUTE FUNCTION public.update_modified_time();


--
-- TOC entry 4934 (class 2620 OID 27757)
-- Name: tasks update_tasks_modified; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_tasks_modified BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- TOC entry 4925 (class 2620 OID 18707)
-- Name: kbom update_user_fields_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_user_fields_trigger BEFORE UPDATE ON public.kbom FOR EACH ROW EXECUTE FUNCTION public.update_user_fields();


--
-- TOC entry 4908 (class 2606 OID 25982)
-- Name: bom_header bom_header_parent_stock_number_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bom_header
    ADD CONSTRAINT bom_header_parent_stock_number_fkey FOREIGN KEY (parent_stock_number) REFERENCES public.item_master(stock_number) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4909 (class 2606 OID 25998)
-- Name: bom_line bom_line_bom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bom_line
    ADD CONSTRAINT bom_line_bom_id_fkey FOREIGN KEY (bom_id) REFERENCES public.bom_header(bom_id) ON DELETE CASCADE;


--
-- TOC entry 4910 (class 2606 OID 26003)
-- Name: bom_line bom_line_component_stock_number_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bom_line
    ADD CONSTRAINT bom_line_component_stock_number_fkey FOREIGN KEY (component_stock_number) REFERENCES public.item_master(stock_number) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4901 (class 2606 OID 17399)
-- Name: kbom fk_preferred_vendor; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kbom
    ADD CONSTRAINT fk_preferred_vendor FOREIGN KEY (preferred_vendor_id) REFERENCES public.vendors(vendor_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4904 (class 2606 OID 17645)
-- Name: inventory_storage inventory_storage_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_storage
    ADD CONSTRAINT inventory_storage_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(item_id);


--
-- TOC entry 4905 (class 2606 OID 17650)
-- Name: inventory_storage inventory_storage_storage_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_storage
    ADD CONSTRAINT inventory_storage_storage_unit_id_fkey FOREIGN KEY (storage_unit_id) REFERENCES public.storage_units(storage_unit_id);


--
-- TOC entry 4913 (class 2606 OID 27648)
-- Name: milestones milestones_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(project_id) ON DELETE CASCADE;


--
-- TOC entry 4902 (class 2606 OID 17394)
-- Name: part_vendor_map part_vendor_map_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.part_vendor_map
    ADD CONSTRAINT part_vendor_map_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(vendor_id);


--
-- TOC entry 4906 (class 2606 OID 17667)
-- Name: receiving_log receiving_log_kbom_rowid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receiving_log
    ADD CONSTRAINT receiving_log_kbom_rowid_fkey FOREIGN KEY (kbom_rowid) REFERENCES public.kbom(rowid);


--
-- TOC entry 4907 (class 2606 OID 17672)
-- Name: receiving_log receiving_log_storage_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receiving_log
    ADD CONSTRAINT receiving_log_storage_unit_id_fkey FOREIGN KEY (storage_unit_id) REFERENCES public.storage_units(storage_unit_id);


--
-- TOC entry 4922 (class 2606 OID 28044)
-- Name: sales_manifest_items sales_manifest_items_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_manifest_items
    ADD CONSTRAINT sales_manifest_items_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.sales_manifest_sections(section_id) ON DELETE CASCADE;


--
-- TOC entry 4921 (class 2606 OID 28026)
-- Name: sales_manifest_sections sales_manifest_sections_manifest_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_manifest_sections
    ADD CONSTRAINT sales_manifest_sections_manifest_id_fkey FOREIGN KEY (manifest_id) REFERENCES public.sales_manifest(manifest_id) ON DELETE CASCADE;


--
-- TOC entry 4903 (class 2606 OID 17619)
-- Name: storage_units storage_units_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_units
    ADD CONSTRAINT storage_units_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(shop_id);


--
-- TOC entry 4912 (class 2606 OID 27562)
-- Name: tab_access tab_access_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tab_access
    ADD CONSTRAINT tab_access_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.user_groups(group_id) ON DELETE CASCADE;


--
-- TOC entry 4920 (class 2606 OID 27741)
-- Name: task_attachments task_attachments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_attachments
    ADD CONSTRAINT task_attachments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(task_id) ON DELETE CASCADE;


--
-- TOC entry 4919 (class 2606 OID 27725)
-- Name: task_comments task_comments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(task_id) ON DELETE CASCADE;


--
-- TOC entry 4917 (class 2606 OID 27709)
-- Name: task_dependencies task_dependencies_depends_on_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_dependencies
    ADD CONSTRAINT task_dependencies_depends_on_task_id_fkey FOREIGN KEY (depends_on_task_id) REFERENCES public.tasks(task_id) ON DELETE CASCADE;


--
-- TOC entry 4918 (class 2606 OID 27704)
-- Name: task_dependencies task_dependencies_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_dependencies
    ADD CONSTRAINT task_dependencies_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(task_id) ON DELETE CASCADE;


--
-- TOC entry 4914 (class 2606 OID 27679)
-- Name: tasks tasks_milestone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_milestone_id_fkey FOREIGN KEY (milestone_id) REFERENCES public.milestones(milestone_id) ON DELETE SET NULL;


--
-- TOC entry 4915 (class 2606 OID 27684)
-- Name: tasks tasks_parent_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_parent_task_id_fkey FOREIGN KEY (parent_task_id) REFERENCES public.tasks(task_id) ON DELETE CASCADE;


--
-- TOC entry 4916 (class 2606 OID 27674)
-- Name: tasks tasks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(project_id) ON DELETE CASCADE;


--
-- TOC entry 4911 (class 2606 OID 27544)
-- Name: user_group_members user_group_members_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_group_members
    ADD CONSTRAINT user_group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.user_groups(group_id) ON DELETE CASCADE;


--
-- TOC entry 5094 (class 0 OID 0)
-- Dependencies: 576
-- Name: TABLE sales_manifest_parts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.sales_manifest_parts TO pg_write_all_data;


--
-- TOC entry 5096 (class 0 OID 0)
-- Dependencies: 536
-- Name: TABLE app_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.app_settings TO pg_write_all_data;


--
-- TOC entry 5097 (class 0 OID 0)
-- Dependencies: 541
-- Name: TABLE bom_header; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.bom_header TO pg_write_all_data;


--
-- TOC entry 5099 (class 0 OID 0)
-- Dependencies: 543
-- Name: TABLE bom_line; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.bom_line TO pg_write_all_data;


--
-- TOC entry 5101 (class 0 OID 0)
-- Dependencies: 531
-- Name: TABLE inventory_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.inventory_items TO pg_write_all_data;


--
-- TOC entry 5103 (class 0 OID 0)
-- Dependencies: 533
-- Name: TABLE inventory_storage; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.inventory_storage TO pg_write_all_data;


--
-- TOC entry 5105 (class 0 OID 0)
-- Dependencies: 539
-- Name: TABLE item_master; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.item_master TO pg_write_all_data;


--
-- TOC entry 5106 (class 0 OID 0)
-- Dependencies: 520
-- Name: TABLE kbom; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.kbom TO pg_write_all_data;


--
-- TOC entry 5107 (class 0 OID 0)
-- Dependencies: 582
-- Name: TABLE kbom_daily_changes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.kbom_daily_changes TO pg_write_all_data;
GRANT SELECT ON TABLE public.kbom_daily_changes TO pg_read_all_data;


--
-- TOC entry 5109 (class 0 OID 0)
-- Dependencies: 580
-- Name: TABLE kbom_history_snapshots; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.kbom_history_snapshots TO pg_write_all_data;
GRANT SELECT ON TABLE public.kbom_history_snapshots TO pg_read_all_data;


--
-- TOC entry 5110 (class 0 OID 0)
-- Dependencies: 584
-- Name: TABLE kbom_daily_progress; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.kbom_daily_progress TO pg_read_all_data;


--
-- TOC entry 5113 (class 0 OID 0)
-- Dependencies: 583
-- Name: TABLE kbom_weekly_trends; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.kbom_weekly_trends TO pg_read_all_data;


--
-- TOC entry 5123 (class 0 OID 0)
-- Dependencies: 538
-- Name: TABLE mfg_schedule; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.mfg_schedule TO pg_write_all_data;


--
-- TOC entry 5125 (class 0 OID 0)
-- Dependencies: 555
-- Name: TABLE milestones; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.milestones TO pg_write_all_data;


--
-- TOC entry 5127 (class 0 OID 0)
-- Dependencies: 544
-- Name: TABLE models; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.models TO pg_write_all_data;


--
-- TOC entry 5128 (class 0 OID 0)
-- Dependencies: 525
-- Name: TABLE part_vendor_map; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.part_vendor_map TO pg_write_all_data;


--
-- TOC entry 5130 (class 0 OID 0)
-- Dependencies: 553
-- Name: TABLE projects; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.projects TO pg_write_all_data;


--
-- TOC entry 5132 (class 0 OID 0)
-- Dependencies: 567
-- Name: TABLE raw_material_requests; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.raw_material_requests TO PUBLIC;


--
-- TOC entry 5134 (class 0 OID 0)
-- Dependencies: 535
-- Name: TABLE receiving_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.receiving_log TO pg_write_all_data;


--
-- TOC entry 5136 (class 0 OID 0)
-- Dependencies: 569
-- Name: TABLE sales_manifest; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.sales_manifest TO pg_write_all_data;


--
-- TOC entry 5137 (class 0 OID 0)
-- Dependencies: 571
-- Name: TABLE sales_manifest_sections; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.sales_manifest_sections TO pg_write_all_data;


--
-- TOC entry 5138 (class 0 OID 0)
-- Dependencies: 578
-- Name: TABLE sales_manifest_approval_status; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.sales_manifest_approval_status TO pg_read_all_data;
GRANT ALL ON TABLE public.sales_manifest_approval_status TO pg_write_all_data;


--
-- TOC entry 5139 (class 0 OID 0)
-- Dependencies: 573
-- Name: TABLE sales_manifest_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.sales_manifest_items TO pg_write_all_data;


--
-- TOC entry 5144 (class 0 OID 0)
-- Dependencies: 574
-- Name: TABLE sales_manifest_view; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.sales_manifest_view TO pg_read_all_data;
GRANT ALL ON TABLE public.sales_manifest_view TO pg_write_all_data;


--
-- TOC entry 5145 (class 0 OID 0)
-- Dependencies: 527
-- Name: TABLE shops; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.shops TO pg_write_all_data;


--
-- TOC entry 5147 (class 0 OID 0)
-- Dependencies: 529
-- Name: TABLE storage_units; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.storage_units TO pg_write_all_data;


--
-- TOC entry 5149 (class 0 OID 0)
-- Dependencies: 550
-- Name: TABLE tab_access; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.tab_access TO pg_write_all_data;


--
-- TOC entry 5151 (class 0 OID 0)
-- Dependencies: 563
-- Name: TABLE task_attachments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.task_attachments TO pg_write_all_data;


--
-- TOC entry 5153 (class 0 OID 0)
-- Dependencies: 561
-- Name: TABLE task_comments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.task_comments TO pg_write_all_data;


--
-- TOC entry 5155 (class 0 OID 0)
-- Dependencies: 559
-- Name: TABLE task_dependencies; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.task_dependencies TO pg_write_all_data;


--
-- TOC entry 5157 (class 0 OID 0)
-- Dependencies: 557
-- Name: TABLE tasks; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.tasks TO pg_write_all_data;


--
-- TOC entry 5159 (class 0 OID 0)
-- Dependencies: 548
-- Name: TABLE user_group_members; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_group_members TO pg_write_all_data;


--
-- TOC entry 5161 (class 0 OID 0)
-- Dependencies: 546
-- Name: TABLE user_groups; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_groups TO pg_write_all_data;


--
-- TOC entry 5163 (class 0 OID 0)
-- Dependencies: 521
-- Name: TABLE user_preferences; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_preferences TO pg_write_all_data;


--
-- TOC entry 5164 (class 0 OID 0)
-- Dependencies: 551
-- Name: TABLE user_tab_access; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_tab_access TO pg_write_all_data;


--
-- TOC entry 5165 (class 0 OID 0)
-- Dependencies: 523
-- Name: TABLE vendors; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.vendors TO pg_write_all_data;


-- Completed on 2025-08-04 19:53:03

--
-- PostgreSQL database dump complete
--

