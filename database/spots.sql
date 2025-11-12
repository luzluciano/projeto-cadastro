-- SEQUENCE: public.spots_id_seq

-- DROP SEQUENCE IF EXISTS public.spots_id_seq;

CREATE SEQUENCE IF NOT EXISTS public.spots_id_seq
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;



-- Table: public.spots

-- DROP TABLE IF EXISTS public.spots;

CREATE TABLE IF NOT EXISTS public.spots
(
    id integer NOT NULL DEFAULT nextval('spots_id_seq'::regclass),
    titulo character varying(255) COLLATE pg_catalog."default" NOT NULL,
    subtitulo character varying(255) COLLATE pg_catalog."default",
    descricao text COLLATE pg_catalog."default" NOT NULL,
    icone character varying(50) COLLATE pg_catalog."default",
    imagem character varying(500) COLLATE pg_catalog."default",
    link_texto character varying(100) COLLATE pg_catalog."default",
    link_url character varying(500) COLLATE pg_catalog."default",
    ativo boolean DEFAULT true,
    ordem integer NOT NULL,
    tipo_spot character varying(20) COLLATE pg_catalog."default" NOT NULL,
    configuracoes json,
    data_inicio timestamp without time zone,
    data_fim timestamp without time zone,
    data_criacao timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT spots_pkey PRIMARY KEY (id),
    CONSTRAINT spots_tipo_spot_check CHECK (tipo_spot::text = ANY (ARRAY['informacao'::character varying, 'acao'::character varying, 'destaque'::character varying, 'promocional'::character varying]::text[]))
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.spots
    OWNER to admin;
-- Index: idx_spots_ativo

-- DROP INDEX IF EXISTS public.idx_spots_ativo;

CREATE INDEX IF NOT EXISTS idx_spots_ativo
    ON public.spots USING btree
    (ativo ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;
-- Index: idx_spots_ordem

-- DROP INDEX IF EXISTS public.idx_spots_ordem;

CREATE INDEX IF NOT EXISTS idx_spots_ordem
    ON public.spots USING btree
    (ordem ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;
-- Index: idx_spots_tipo

-- DROP INDEX IF EXISTS public.idx_spots_tipo;

CREATE INDEX IF NOT EXISTS idx_spots_tipo
    ON public.spots USING btree
    (tipo_spot COLLATE pg_catalog."default" ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;
-- Index: idx_spots_vigencia

-- DROP INDEX IF EXISTS public.idx_spots_vigencia;

CREATE INDEX IF NOT EXISTS idx_spots_vigencia
    ON public.spots USING btree
    (data_inicio ASC NULLS LAST, data_fim ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;

-- Trigger: update_spots_data_atualizacao

-- DROP TRIGGER IF EXISTS update_spots_data_atualizacao ON public.spots;
-- FUNCTION: public.update_spots_data_atualizacao()

-- DROP FUNCTION IF EXISTS public.update_spots_data_atualizacao();

CREATE OR REPLACE FUNCTION public.update_spots_data_atualizacao()
    RETURNS trigger
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE NOT LEAKPROOF
AS $BODY$
      BEGIN
          NEW.data_atualizacao = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      
$BODY$;

ALTER FUNCTION public.update_spots_data_atualizacao()
    OWNER TO admin;


CREATE OR REPLACE TRIGGER update_spots_data_atualizacao
    BEFORE UPDATE 
    ON public.spots
    FOR EACH ROW
    EXECUTE FUNCTION public.update_spots_data_atualizacao();



    ALTER SEQUENCE public.spots_id_seq
    OWNED BY public.spots.id;

ALTER SEQUENCE public.spots_id_seq
    OWNER TO admin;