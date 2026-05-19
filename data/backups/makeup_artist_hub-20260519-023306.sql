--
-- PostgreSQL database dump
--

\restrict RFvw6BlH8BOnKkODPjcnlehcrvLLPvfWTCka69gnqKYNOeunWwxwBAU4RatRKya

-- Dumped from database version 16.14 (Homebrew)
-- Dumped by pg_dump version 16.14 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_booking_id_bookings_id_fk;
ALTER TABLE IF EXISTS ONLY public.bookings DROP CONSTRAINT IF EXISTS bookings_contract_template_id_contract_templates_id_fk;
ALTER TABLE IF EXISTS ONLY public.bookings DROP CONSTRAINT IF EXISTS bookings_client_id_clients_id_fk;
ALTER TABLE IF EXISTS ONLY public.booking_line_items DROP CONSTRAINT IF EXISTS booking_line_items_service_item_id_service_items_id_fk;
ALTER TABLE IF EXISTS ONLY public.booking_line_items DROP CONSTRAINT IF EXISTS booking_line_items_event_id_booking_events_id_fk;
ALTER TABLE IF EXISTS ONLY public.booking_line_items DROP CONSTRAINT IF EXISTS booking_line_items_booking_id_bookings_id_fk;
ALTER TABLE IF EXISTS ONLY public.booking_events DROP CONSTRAINT IF EXISTS booking_events_booking_id_bookings_id_fk;
ALTER TABLE IF EXISTS ONLY public.booking_activity DROP CONSTRAINT IF EXISTS booking_activity_booking_id_bookings_id_fk;
ALTER TABLE IF EXISTS ONLY public.service_items DROP CONSTRAINT IF EXISTS service_items_pkey;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_pkey;
ALTER TABLE IF EXISTS ONLY public.contract_templates DROP CONSTRAINT IF EXISTS contract_templates_pkey;
ALTER TABLE IF EXISTS ONLY public.clients DROP CONSTRAINT IF EXISTS clients_pkey;
ALTER TABLE IF EXISTS ONLY public.bookings DROP CONSTRAINT IF EXISTS bookings_pkey;
ALTER TABLE IF EXISTS ONLY public.booking_line_items DROP CONSTRAINT IF EXISTS booking_line_items_pkey;
ALTER TABLE IF EXISTS ONLY public.booking_events DROP CONSTRAINT IF EXISTS booking_events_pkey;
ALTER TABLE IF EXISTS ONLY public.booking_activity DROP CONSTRAINT IF EXISTS booking_activity_pkey;
ALTER TABLE IF EXISTS ONLY public.artist_profiles DROP CONSTRAINT IF EXISTS artist_profiles_pkey;
ALTER TABLE IF EXISTS public.service_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.payments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.contract_templates ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.clients ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.bookings ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.booking_line_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.booking_events ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.booking_activity ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.artist_profiles ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.service_items_id_seq;
DROP TABLE IF EXISTS public.service_items;
DROP SEQUENCE IF EXISTS public.payments_id_seq;
DROP TABLE IF EXISTS public.payments;
DROP SEQUENCE IF EXISTS public.contract_templates_id_seq;
DROP TABLE IF EXISTS public.contract_templates;
DROP SEQUENCE IF EXISTS public.clients_id_seq;
DROP TABLE IF EXISTS public.clients;
DROP SEQUENCE IF EXISTS public.bookings_id_seq;
DROP TABLE IF EXISTS public.bookings;
DROP SEQUENCE IF EXISTS public.booking_line_items_id_seq;
DROP TABLE IF EXISTS public.booking_line_items;
DROP SEQUENCE IF EXISTS public.booking_events_id_seq;
DROP TABLE IF EXISTS public.booking_events;
DROP SEQUENCE IF EXISTS public.booking_activity_id_seq;
DROP TABLE IF EXISTS public.booking_activity;
DROP SEQUENCE IF EXISTS public.artist_profiles_id_seq;
DROP TABLE IF EXISTS public.artist_profiles;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: artist_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.artist_profiles (
    id integer NOT NULL,
    business_name text DEFAULT 'Glam CRM'::text NOT NULL,
    display_name text NOT NULL,
    email text,
    phone text,
    website text,
    instagram text,
    payment_method text,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: artist_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.artist_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: artist_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.artist_profiles_id_seq OWNED BY public.artist_profiles.id;


--
-- Name: booking_activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_activity (
    id integer NOT NULL,
    booking_id integer NOT NULL,
    action text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    metadata text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: booking_activity_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.booking_activity_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: booking_activity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.booking_activity_id_seq OWNED BY public.booking_activity.id;


--
-- Name: booking_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_events (
    id integer NOT NULL,
    booking_id integer NOT NULL,
    event_name text NOT NULL,
    event_date text NOT NULL,
    services_begin text,
    completion_target text,
    hair_and_makeup_count integer DEFAULT 0 NOT NULL,
    hair_only_count integer DEFAULT 0 NOT NULL,
    makeup_only_count integer DEFAULT 0 NOT NULL,
    makeup_rate numeric(10,2) DEFAULT '150'::numeric NOT NULL,
    hair_rate numeric(10,2) DEFAULT '135'::numeric NOT NULL,
    hair_and_makeup_rate numeric(10,2) DEFAULT '285'::numeric NOT NULL,
    subtotal numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);


--
-- Name: booking_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.booking_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: booking_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.booking_events_id_seq OWNED BY public.booking_events.id;


--
-- Name: booking_line_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_line_items (
    id integer NOT NULL,
    booking_id integer NOT NULL,
    service_item_id integer,
    name text NOT NULL,
    description text,
    kind text DEFAULT 'service'::text NOT NULL,
    quantity numeric(10,2) DEFAULT '1'::numeric NOT NULL,
    unit_price numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    unit_label text DEFAULT 'person'::text NOT NULL,
    calculation_note text,
    sort_order integer DEFAULT 0 NOT NULL,
    event_id integer
);


--
-- Name: booking_line_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.booking_line_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: booking_line_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.booking_line_items_id_seq OWNED BY public.booking_line_items.id;


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings (
    id integer NOT NULL,
    client_id integer NOT NULL,
    event_type text NOT NULL,
    location text NOT NULL,
    location_detail text,
    first_service_date text,
    status text DEFAULT 'draft'::text NOT NULL,
    grand_total numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    retainer_amount numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    retainer_paid boolean DEFAULT false NOT NULL,
    balance_paid boolean DEFAULT false NOT NULL,
    balance_due_date text,
    payment_method text,
    early_morning_fee numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    travel_fee numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone,
    contract_template_id integer
);


--
-- Name: bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bookings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bookings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bookings_id_seq OWNED BY public.bookings.id;


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: clients_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clients_id_seq OWNED BY public.clients.id;


--
-- Name: contract_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contract_templates (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    body text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    locked boolean DEFAULT false NOT NULL
);


--
-- Name: contract_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contract_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contract_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contract_templates_id_seq OWNED BY public.contract_templates.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    booking_id integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    type text NOT NULL,
    note text,
    paid_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: service_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_items (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    kind text DEFAULT 'service'::text NOT NULL,
    default_unit_price numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    unit_label text DEFAULT 'person'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: service_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.service_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: service_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.service_items_id_seq OWNED BY public.service_items.id;


--
-- Name: artist_profiles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artist_profiles ALTER COLUMN id SET DEFAULT nextval('public.artist_profiles_id_seq'::regclass);


--
-- Name: booking_activity id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_activity ALTER COLUMN id SET DEFAULT nextval('public.booking_activity_id_seq'::regclass);


--
-- Name: booking_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_events ALTER COLUMN id SET DEFAULT nextval('public.booking_events_id_seq'::regclass);


--
-- Name: booking_line_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_line_items ALTER COLUMN id SET DEFAULT nextval('public.booking_line_items_id_seq'::regclass);


--
-- Name: bookings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings ALTER COLUMN id SET DEFAULT nextval('public.bookings_id_seq'::regclass);


--
-- Name: clients id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients ALTER COLUMN id SET DEFAULT nextval('public.clients_id_seq'::regclass);


--
-- Name: contract_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_templates ALTER COLUMN id SET DEFAULT nextval('public.contract_templates_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: service_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_items ALTER COLUMN id SET DEFAULT nextval('public.service_items_id_seq'::regclass);


--
-- Data for Name: artist_profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.artist_profiles (id, business_name, display_name, email, phone, website, instagram, payment_method, notes, created_at, updated_at) FROM stdin;
1	Alyaan Inc.	Yeasmin Bhuiyan	Yeasminbhuiyan1997@gmail.com	(347) 781-8809	\N	\N	Zelle (347) 781-8809	\N	2026-05-18 00:55:04.645379	2026-05-18 05:53:35.392
\.


--
-- Data for Name: booking_activity; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.booking_activity (id, booking_id, action, title, description, metadata, created_at) FROM stdin;
21	6	booking.created	Booking created	Booking was created for Chaitya Joshi.	\N	2026-05-18 02:16:56.407201
22	6	line_item.updated	Service or fee updated	Hair Only was updated.	\N	2026-05-18 02:21:44.211711
23	6	line_item.created	Service or fee added	Hair Only was added to the booking.	\N	2026-05-18 02:21:44.224299
24	6	line_item.created	Service or fee added	Hair Only was added to the booking.	\N	2026-05-18 02:21:44.236196
25	6	line_item.created	Service or fee added	Hair Only was added to the booking.	\N	2026-05-18 02:21:44.247905
26	6	line_item.created	Service or fee added	Hair Only was added to the booking.	\N	2026-05-18 02:21:44.259052
27	6	line_item.created	Service or fee added	Hair Only was added to the booking.	\N	2026-05-18 02:21:44.273863
28	6	line_item.created	Service or fee added	Hair Only was added to the booking.	\N	2026-05-18 02:21:44.288809
29	6	line_item.created	Service or fee added	Hair Only was added to the booking.	\N	2026-05-18 02:21:44.298707
30	6	line_item.created	Service or fee added	Hair Only was added to the booking.	\N	2026-05-18 02:21:44.311046
31	6	line_item.created	Service or fee added	Hair Only was added to the booking.	\N	2026-05-18 02:21:44.320235
32	6	line_item.created	Service or fee added	Hair Only was added to the booking.	\N	2026-05-18 02:21:44.335529
33	6	line_item.created	Service or fee added	Hair Only was added to the booking.	\N	2026-05-18 02:21:44.343834
34	6	line_item.created	Service or fee added	Hair Only was added to the booking.	\N	2026-05-18 02:21:44.354932
35	6	event.created	Event added	Sangeet was added for 2026-09-11.	\N	2026-05-18 02:22:27.419021
36	6	event.created	Event added	Wedding Ceremony was added for 2026-09-12.	\N	2026-05-18 02:22:56.959668
37	6	event.created	Event added	Reception was added for 2026-09-12.	\N	2026-05-18 02:23:15.747151
38	6	line_item.updated	Service assignment updated	Hair Only was assigned to Sangeet.	\N	2026-05-18 02:23:26.067288
39	6	line_item.updated	Service assignment updated	Hair Only was assigned to Sangeet.	\N	2026-05-18 02:23:27.391321
40	6	line_item.updated	Service assignment updated	Hair Only was assigned to Sangeet.	\N	2026-05-18 02:23:28.556127
41	6	line_item.updated	Service assignment updated	Hair Only was assigned to Wedding Ceremony.	\N	2026-05-18 02:23:35.886165
42	6	line_item.updated	Service assignment updated	Hair Only was assigned to Wedding Ceremony.	\N	2026-05-18 02:23:37.310869
43	6	line_item.updated	Service assignment updated	Hair Only was assigned to Wedding Ceremony.	\N	2026-05-18 02:23:38.753171
44	6	line_item.updated	Service assignment updated	Hair Only was assigned to Wedding Ceremony.	\N	2026-05-18 02:23:39.947182
45	6	line_item.updated	Service assignment updated	Hair Only was assigned to Wedding Ceremony.	\N	2026-05-18 02:23:41.928661
46	6	line_item.updated	Service assignment updated	Hair Only was assigned to Wedding Ceremony.	\N	2026-05-18 02:23:43.264893
47	6	line_item.updated	Service assignment updated	Hair Only was assigned to Wedding Ceremony.	\N	2026-05-18 02:23:45.053311
48	6	line_item.updated	Service assignment updated	Hair Only was assigned to Reception.	\N	2026-05-18 02:23:56.428845
49	6	line_item.updated	Service assignment updated	Hair Only was assigned to Reception.	\N	2026-05-18 02:23:58.562214
50	6	line_item.updated	Service assignment updated	Hair Only was assigned to Reception.	\N	2026-05-18 02:24:00.563419
51	6	line_item.updated	Service or fee updated	Makeup Only was updated.	\N	2026-05-18 02:27:12.579617
52	6	line_item.created	Service or fee added	Makeup Only was added to the booking.	\N	2026-05-18 02:27:12.590336
53	6	line_item.created	Service or fee added	Makeup Only was added to the booking.	\N	2026-05-18 02:27:12.606441
54	6	line_item.created	Service or fee added	Makeup Only was added to the booking.	\N	2026-05-18 02:27:12.620732
55	6	line_item.created	Service or fee added	Makeup Only was added to the booking.	\N	2026-05-18 02:27:12.63711
56	6	line_item.created	Service or fee added	Makeup Only was added to the booking.	\N	2026-05-18 02:27:12.648843
57	6	line_item.created	Service or fee added	Makeup Only was added to the booking.	\N	2026-05-18 02:27:12.657099
58	6	line_item.created	Service or fee added	Makeup Only was added to the booking.	\N	2026-05-18 02:27:12.666074
59	6	line_item.created	Service or fee added	Makeup Only was added to the booking.	\N	2026-05-18 02:27:12.674784
60	6	line_item.created	Service or fee added	Makeup Only was added to the booking.	\N	2026-05-18 02:27:12.684233
61	6	line_item.created	Service or fee added	Makeup Only was added to the booking.	\N	2026-05-18 02:27:12.695856
62	6	line_item.updated	Service or fee updated	Hair Only was updated.	\N	2026-05-18 02:28:35.908416
63	6	line_item.created	Service or fee added	Hair Only was added to the booking.	\N	2026-05-18 02:28:35.920749
64	6	line_item.created	Service or fee added	Hair Only was added to the booking.	\N	2026-05-18 02:28:35.92733
65	6	line_item.updated	Service assignment updated	Makeup Only was assigned to Reception.	\N	2026-05-18 02:47:28.753815
66	6	line_item.updated	Service assignment updated	Makeup Only was assigned to Reception.	\N	2026-05-18 02:47:30.344761
67	6	line_item.updated	Service assignment updated	Makeup Only was assigned to Reception.	\N	2026-05-18 02:47:33.21686
68	6	line_item.updated	Service assignment updated	Makeup Only was assigned to Wedding Ceremony.	\N	2026-05-18 02:47:55.502821
69	6	line_item.updated	Service assignment updated	Makeup Only was assigned to Wedding Ceremony.	\N	2026-05-18 02:47:56.933652
70	6	line_item.updated	Service assignment updated	Makeup Only was assigned to Wedding Ceremony.	\N	2026-05-18 02:47:58.839757
71	6	line_item.updated	Service assignment updated	Makeup Only was assigned to Wedding Ceremony.	\N	2026-05-18 02:48:00.712442
72	6	line_item.updated	Service assignment updated	Makeup Only was assigned to Wedding Ceremony.	\N	2026-05-18 02:48:02.392882
73	6	line_item.updated	Service assignment updated	Makeup Only was assigned to Sangeet.	\N	2026-05-18 02:48:07.143708
74	6	line_item.updated	Service assignment updated	Makeup Only was assigned to Sangeet.	\N	2026-05-18 02:48:08.527812
75	6	line_item.updated	Service assignment updated	Makeup Only was assigned to Sangeet.	\N	2026-05-18 02:48:09.876991
76	6	line_item.updated	Service assignment updated	Hair Only was assigned to Sangeet.	\N	2026-05-18 02:51:30.817987
77	6	line_item.updated	Service assignment updated	Hair Only was assigned to Sangeet.	\N	2026-05-18 02:53:24.289977
79	7	booking.created	Booking created	Booking was created for Sandy Villar.	\N	2026-05-19 00:47:02.425544
80	7	event.created	Event added	Party Makeup was added for 2026-06-28.	\N	2026-05-19 00:47:02.438295
81	8	booking.created	Booking created	Booking was created for Nehaal Siddiqi.	\N	2026-05-19 00:58:43.258258
82	8	event.created	Event added	Make up (Day 1) was added for 2026-09-04.	\N	2026-05-19 00:58:43.269908
83	8	event.created	Event added	Make up (Day 2) was added for 2026-09-05.	\N	2026-05-19 00:59:07.416318
84	8	event.created	Event added	Make up (Day 3) was added for 2026-09-06.	\N	2026-05-19 00:59:22.175499
85	8	line_item.updated	Service assignment updated	Makeup Only was assigned to Make up (Day 1).	\N	2026-05-19 00:59:42.026772
86	8	line_item.updated	Service assignment updated	Makeup Only was moved to booking-level charges.	\N	2026-05-19 00:59:43.400976
87	8	event.updated	Event updated	Make up (Day 1) - 179 S Rockingham Way, Buffalo, NY 14228 was updated.	\N	2026-05-19 01:02:13.104005
88	8	event.updated	Event updated	Make up (Day 3) - 300 3rd St, Niagara Falls, NY 14303 was updated.	\N	2026-05-19 01:02:25.598144
89	8	event.updated	Event updated	Make up (Day 2) - 300 3rd St, Niagara Falls, NY 14303 was updated.	\N	2026-05-19 01:02:31.220913
90	8	line_item.updated	Service or fee updated	Makeup Only was updated.	\N	2026-05-19 01:02:38.879152
91	8	line_item.created	Service or fee added	Makeup Only was added to the booking.	\N	2026-05-19 01:02:38.893868
92	8	line_item.created	Service or fee added	Makeup Only was added to the booking.	\N	2026-05-19 01:02:38.905273
93	8	line_item.updated	Service assignment updated	Makeup Only was assigned to Make up (Day 1) - 179 S Rockingham Way, Buffalo, NY 14228.	\N	2026-05-19 01:02:50.328986
94	8	line_item.updated	Service assignment updated	Makeup Only was assigned to Make up (Day 3) - 300 3rd St, Niagara Falls, NY 14303.	\N	2026-05-19 01:02:51.692632
95	8	line_item.updated	Service assignment updated	Makeup Only was assigned to Make up (Day 2) - 300 3rd St, Niagara Falls, NY 14303.	\N	2026-05-19 01:02:53.366154
96	8	line_item.updated	Service or fee updated	Travel Fee was updated.	\N	2026-05-19 01:02:59.094041
97	8	line_item.created	Service or fee added	Travel Fee was added to the booking.	\N	2026-05-19 01:02:59.128571
98	8	line_item.created	Service or fee added	Travel Fee was added to the booking.	\N	2026-05-19 01:02:59.139833
99	8	line_item.updated	Service assignment updated	Travel Fee was assigned to Make up (Day 1) - 179 S Rockingham Way, Buffalo, NY 14228.	\N	2026-05-19 01:03:01.537776
100	8	line_item.updated	Service assignment updated	Travel Fee was assigned to Make up (Day 2) - 300 3rd St, Niagara Falls, NY 14303.	\N	2026-05-19 01:03:03.204959
101	8	line_item.updated	Service assignment updated	Travel Fee was assigned to Make up (Day 3) - 300 3rd St, Niagara Falls, NY 14303.	\N	2026-05-19 01:03:04.715981
102	8	line_item.updated	Service assignment updated	Makeup Only was assigned to Make up (Day 2) - 300 3rd St, Niagara Falls, NY 14303.	\N	2026-05-19 01:03:07.537602
103	8	line_item.updated	Service assignment updated	Makeup Only was assigned to Make up (Day 3) - 300 3rd St, Niagara Falls, NY 14303.	\N	2026-05-19 01:03:14.019998
104	8	line_item.created	Service or fee added	Bridal Hijab Setup was added to the booking.	\N	2026-05-19 01:33:36.441788
105	8	line_item.deleted	Service or fee removed	Bridal Hijab Setup was removed from the booking.	\N	2026-05-19 01:33:46.849422
106	9	booking.created	Booking created	Booking was created for Anusha Mariyam.	\N	2026-05-19 01:38:44.514369
107	9	event.created	Event added	Bridal Makeup was added for 2026-06-19.	\N	2026-05-19 01:38:44.529736
108	9	line_item.updated	Service assignment updated	Bridal Makeup was assigned to Bridal Makeup.	\N	2026-05-19 01:39:17.34666
109	9	line_item.updated	Service assignment updated	Bridal Setup was assigned to Bridal Makeup.	\N	2026-05-19 01:39:18.35444
110	9	line_item.updated	Service assignment updated	Bridal Hijab Setup was assigned to Bridal Makeup.	\N	2026-05-19 01:39:19.438486
111	9	line_item.updated	Service assignment updated	Travel Fee was assigned to Bridal Makeup.	\N	2026-05-19 01:39:20.54226
112	9	booking.updated	Booking updated	Retainer paid changed from no to yes	{"fields":["retainerPaid"]}	2026-05-19 01:39:32.209685
113	9	booking.updated	Booking updated	Retainer paid changed from yes to no	{"fields":["retainerPaid"]}	2026-05-19 01:39:36.155824
114	9	booking.updated	Booking updated	Balance paid changed from no to yes	{"fields":["balancePaid"]}	2026-05-19 01:39:36.774933
115	9	booking.updated	Booking updated	Balance paid changed from yes to no	{"fields":["balancePaid"]}	2026-05-19 01:39:37.513475
116	9	booking.updated	Booking updated	Retainer paid changed from no to yes	{"fields":["retainerPaid"]}	2026-05-19 01:39:38.463879
117	9	booking.updated	Booking updated	Balance paid changed from no to yes	{"fields":["balancePaid"]}	2026-05-19 01:39:39.087065
118	9	booking.updated	Booking updated	Balance paid changed from yes to no	{"fields":["balancePaid"]}	2026-05-19 01:39:39.621995
119	9	booking.updated	Booking updated	Retainer paid changed from yes to no	{"fields":["retainerPaid"]}	2026-05-19 01:39:40.09178
120	9	line_item.updated	Service assignment updated	Travel Fee was moved to booking-level charges.	\N	2026-05-19 01:41:56.354159
121	6	booking.updated	Booking updated	Event type changed from Wedding Party to Party	{"fields":["eventType"]}	2026-05-19 02:27:15.750352
\.


--
-- Data for Name: booking_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.booking_events (id, booking_id, event_name, event_date, services_begin, completion_target, hair_and_makeup_count, hair_only_count, makeup_only_count, makeup_rate, hair_rate, hair_and_makeup_rate, subtotal, sort_order) FROM stdin;
5	6	Sangeet	2026-09-11	1:00 PM	5:00 PM	0	0	0	150.00	135.00	285.00	0.00	0
6	6	Wedding Ceremony	2026-09-12	3:00 AM	8:00 AM	0	0	0	150.00	135.00	285.00	0.00	0
7	6	Reception	2026-09-12	1:00 PM	5:00 PM	0	0	0	150.00	135.00	285.00	0.00	0
8	7	Party Makeup	2026-06-28	2:00 PM	5:00 PM	0	0	0	150.00	135.00	285.00	0.00	0
9	8	Make up (Day 1) - 179 S Rockingham Way, Buffalo, NY 14228	2026-09-04			0	0	0	150.00	135.00	285.00	0.00	0
11	8	Make up (Day 3) - 300 3rd St, Niagara Falls, NY 14303	2026-09-06			0	0	0	150.00	135.00	285.00	0.00	0
10	8	Make up (Day 2) - 300 3rd St, Niagara Falls, NY 14303	2026-09-05			0	0	0	150.00	135.00	285.00	0.00	0
12	9	Bridal Makeup	2026-06-19	12:00 PM	4:00 PM	0	0	0	150.00	135.00	285.00	0.00	0
\.


--
-- Data for Name: booking_line_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.booking_line_items (id, booking_id, service_item_id, name, description, kind, quantity, unit_price, unit_label, calculation_note, sort_order, event_id) FROM stdin;
33	6	2	Hair Only	Hair service for one person.	service	1.00	150.00	person	1 Hair Only @ $150	1	5
34	6	2	Hair Only	Hair service for one person.	service	1.00	150.00	person	1 Hair Only @ $150	2	5
36	8	1	Makeup Only	Non-bridal event makeup / soft glam.	service	1.00	150.00	person	1 Makeup Only @ $150	0	9
44	9	10	Bridal Setup	\N	service	1.00	50.00	person	1 Bridal Setup @ $50	10	12
8	6	5	Travel Fee	Flat travel fee for the listed service location.	fee	1.00	150.00	booking	Flat travel fee for the listed service location.	10	\N
9	6	4	Early Morning Fee	Flat fee for early service start times.	fee	1.00	200.00	booking	Flat fee for early service start times.	20	\N
10	6	1	Makeup Only	Non-bridal event makeup / soft glam.	service	1.00	150.00	person	1 Makeup Only @ $150	30	7
45	9	11	Bridal Hijab Setup	\N	service	1.00	50.00	person	1 Bridal Hijab Setup @ $50	20	12
11	6	2	Hair Only	Hair service for one person.	service	1.00	150.00	person	1 Hair Only @ $150	1	5
12	6	2	Hair Only	Hair service for one person.	service	1.00	150.00	person	1 Hair Only @ $150	2	5
13	6	2	Hair Only	Hair service for one person.	service	1.00	150.00	person	1 Hair Only @ $150	3	6
14	6	2	Hair Only	Hair service for one person.	service	1.00	150.00	person	1 Hair Only @ $150	4	6
15	6	2	Hair Only	Hair service for one person.	service	1.00	150.00	person	1 Hair Only @ $150	5	6
16	6	2	Hair Only	Hair service for one person.	service	1.00	150.00	person	1 Hair Only @ $150	6	6
17	6	2	Hair Only	Hair service for one person.	service	1.00	150.00	person	1 Hair Only @ $150	7	6
18	6	2	Hair Only	Hair service for one person.	service	1.00	150.00	person	1 Hair Only @ $150	8	6
19	6	2	Hair Only	Hair service for one person.	service	1.00	150.00	person	1 Hair Only @ $150	9	6
20	6	2	Hair Only	Hair service for one person.	service	1.00	150.00	person	1 Hair Only @ $150	10	7
21	6	2	Hair Only	Hair service for one person.	service	1.00	150.00	person	1 Hair Only @ $150	11	7
22	6	2	Hair Only	Hair service for one person.	service	1.00	150.00	person	1 Hair Only @ $150	12	7
23	6	1	Makeup Only	Non-bridal event makeup / soft glam.	service	1.00	150.00	person	1 Makeup Only @ $150	31	7
24	6	1	Makeup Only	Non-bridal event makeup / soft glam.	service	1.00	150.00	person	1 Makeup Only @ $150	32	7
25	6	1	Makeup Only	Non-bridal event makeup / soft glam.	service	1.00	150.00	person	1 Makeup Only @ $150	33	6
26	6	1	Makeup Only	Non-bridal event makeup / soft glam.	service	1.00	150.00	person	1 Makeup Only @ $150	34	6
27	6	1	Makeup Only	Non-bridal event makeup / soft glam.	service	1.00	150.00	person	1 Makeup Only @ $150	35	6
28	6	1	Makeup Only	Non-bridal event makeup / soft glam.	service	1.00	150.00	person	1 Makeup Only @ $150	36	6
29	6	1	Makeup Only	Non-bridal event makeup / soft glam.	service	1.00	150.00	person	1 Makeup Only @ $150	37	6
30	6	1	Makeup Only	Non-bridal event makeup / soft glam.	service	1.00	150.00	person	1 Makeup Only @ $150	38	5
31	6	1	Makeup Only	Non-bridal event makeup / soft glam.	service	1.00	150.00	person	1 Makeup Only @ $150	39	5
32	6	1	Makeup Only	Non-bridal event makeup / soft glam.	service	1.00	150.00	person	1 Makeup Only @ $150	40	5
7	6	2	Hair Only	Hair service for one person.	service	3.00	150.00	person	1 Hair Only @ $150	0	5
35	7	1	Makeup Only	Non-bridal event makeup / soft glam.	service	1.00	150.00	person	1 Makeup Only @ $150	0	\N
37	8	5	Travel Fee	Flat travel fee for the listed service location.	fee	1.00	25.00	booking	Travel fee for the listed service location.	10	9
46	9	5	Travel Fee	Flat travel fee for the listed service location.	fee	1.00	50.00	booking	Flat travel fee for the listed service location.	30	\N
40	8	5	Travel Fee	Flat travel fee for the listed service location.	fee	1.00	25.00	booking	Travel fee for the listed service location.	11	10
41	8	5	Travel Fee	Flat travel fee for the listed service location.	fee	1.00	25.00	booking	Travel fee for the listed service location.	12	11
38	8	1	Makeup Only	Non-bridal event makeup / soft glam.	service	1.00	150.00	person	1 Makeup Only @ $150	1	10
39	8	1	Makeup Only	Non-bridal event makeup / soft glam.	service	1.00	150.00	person	1 Makeup Only @ $150	2	11
43	9	7	Bridal Makeup	\N	service	1.00	300.00	person	1 Bridal Makeup @ $300	0	12
\.


--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bookings (id, client_id, event_type, location, location_detail, first_service_date, status, grand_total, retainer_amount, retainer_paid, balance_paid, balance_due_date, payment_method, early_morning_fee, travel_fee, notes, created_at, deleted_at, contract_template_id) FROM stdin;
9	9	Bridal	1830 Abbott Rd, Lackawanna, NY 14218	\N	2026-06-19	draft	450.00	112.50	f	f	\N	Zelle (347) 781-8809	0.00	0.00	\N	2026-05-19 01:38:44.48973	\N	5
6	6	Party	The Statler Hotel, Buffalo, New York	\N	2026-09-11	draft	4550.00	1137.50	f	f	2026-09-10	Alyaan Inc. Zelle (347) 781-8809	0.00	0.00	\N	2026-05-18 02:16:56.388296	\N	1
7	7	Party	357 14th St, Buffalo NY 14213	\N	2026-06-28	draft	150.00	37.50	f	f	\N	Zelle (347) 781-8809	0.00	0.00	\N	2026-05-19 00:47:02.406948	\N	1
8	8	Party	179 S Rockingham Way, Buffalo, NY 14228 & 300 3rd St, Niagara Falls, NY 14303	\N	2026-09-04	draft	525.00	131.25	f	f	\N	Zelle (347) 781-8809	0.00	0.00	\N	2026-05-19 00:58:43.249365	\N	1
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clients (id, name, email, phone, notes, created_at) FROM stdin;
6	Chaitya Joshi	chaityaj@buffalo.edu	\N	\N	2026-05-18 02:16:56.367052
7	Sandy Villar	Villar_sandy@yahoo.com	(405) 695-1296	\N	2026-05-19 00:47:02.385768
8	Nehaal Siddiqi	Nehaalsiddiqi@gmail.com	(716) 908-8436	\N	2026-05-19 00:58:43.232053
9	Anusha Mariyam	Anusha120906@gmail.com	(929) 545-8871	\N	2026-05-19 01:38:44.479855
\.


--
-- Data for Name: contract_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contract_templates (id, name, description, body, active, is_default, created_at, updated_at, locked) FROM stdin;
1	Non-Bridal Makeup and Hair Service Agreement	Locked non-bridal party/event makeup and hair service agreement generated from the current contract view.	{\n  "version": 1,\n  "clauses": {\n    "intro": "This Makeup & Hair Service Agreement is between the Artist and Client for makeup and hair services at the listed event location. This Agreement becomes binding when signed by both parties and the non-refundable retainer is received by Artist.",\n    "schedule": "The service windows below are for scheduling and coordination. Contracted services, quantities, and fees are listed in the Pricing section. Artist is not responsible for the actual start time of any ceremony, reception, cocktail hour, photo session, or other event activity.",\n    "pricing": "The rate schedule lists the unit prices. The booking charges table applies those rates to the selected quantities for this Agreement.",\n    "payment": "The retainer is earned upon receipt because Artist reserves the requested dates and times, may decline other work, and begins planning. No dates or times are reserved until this Agreement is signed and the retainer is received. The retainer is non-refundable and non-transferable. The remaining balance must be paid in cleared funds by the deadline above. Artist is not required to begin or continue services until the balance is paid.",\n    "scope": "Makeup service rates apply to the selected makeup services shown in this Agreement. Full bridal makeup, highly detailed eye looks, rhinestones, glitter-heavy looks, face/body art, tattoo coverage, or other advanced/custom looks are not included unless agreed in writing. Hair service rates apply to the selected hairstyle categories shown in this Agreement. Washing, blow-drying, drying wet hair, extensions, padding, accessories, veil or dupatta placement, jewelry setting, or elaborate bridal hair are not included unless agreed in writing. Touch-up kits, extra touch-ups, style changes, upgrades, and additional people are subject to Artist availability, may be declined, and must be paid before the additional service begins.",\n    "responsibilities": "Client must provide accurate timing, location, access, parking, room, and service recipient information before the event date. Client is responsible for sharing preparation, timing, allergy-disclosure, conduct, and setup requirements with every person receiving services. Client must provide a clean, safe, smoke-free, well-lit service area with a table or workstation, chair, nearby outlet, and enough space for Artist, assigned assistants, tools, and products.",\n    "limitations": "All people receiving services must be present, ready, and prepared at their scheduled time. Artist may set or revise the order of services to protect the overall timeline. If someone is late, unavailable, unprepared, has wet hair, has makeup already applied, has lash extensions that were supposed to be removed, or otherwise causes delay, Artist may shorten, modify, or skip that service to stay on schedule. No refund, credit, or price reduction will be given for services shortened, modified, skipped, refused, or discontinued due to late arrival, lack of preparation, client delay, guest delay, venue delay, room access issues, safety concerns, or schedule changes outside Artist's control.",\n    "cancellation": "The non-refundable retainer is kept if Client cancels. The parties agree that the cancellation amounts shown in this Agreement are reasonable because Artist reserves the dates, may decline other work, and late replacement bookings may be difficult. A request to reschedule, postpone, change locations, or materially change the timeline is subject to Artist availability and must be agreed in writing. If Artist is unavailable or the parties do not agree to the change, the request is treated as a Client cancellation.",\n    "emergency": "If the Artist cannot perform due to illness, emergency, family emergency, accident, severe weather, venue restrictions, transportation disruption, unsafe conditions, or any circumstances beyond the Artist's reasonable control, the Artist will make reasonable efforts to arrange a qualified substitute. If no substitute is available, the Client will receive a full refund of all amounts paid for any services not performed. If a service is not completed due to the Artist's own delay or inability, and the failure is not caused by the Client, guests, venue, access, preparation, timing, safety, or schedule issues, the Client will receive a refund of the amount paid for that specific unperformed service.",\n    "general": "Artist may take and use photos or videos of completed services for portfolio, website, advertising, or social media only if Client gives written consent. Client may decline without affecting services. This Agreement is governed by New York law. The parties will try to resolve disputes informally first. Any changes must be in writing and confirmed by both parties. Electronic signatures are valid. This Agreement is the full agreement between the parties and replaces prior messages, quotes, or discussions. Services will be performed in accordance with applicable health, sanitation, legal, and venue requirements disclosed to Artist in advance.",\n    "signatures": "By signing below, Client confirms that Client understands the non-refundable retainer, cancellation policy, final payment deadline, guaranteed minimum services, late/unprepared client policy, service limitations, allergy disclosure requirements, and no-payment-no-service rule."\n  }\n}	t	t	2026-05-18 00:55:04.656557	2026-05-19 06:25:55.008	t
5	Bridal Makeup and Hair Service Agreement	Locked bridal agreement version duplicated from the current contract view for future bridal-specific edits.	{\n  "version": 1,\n  "contractType": "bridal",\n  "baseAgreement": "Current agreement duplicated with bridal-specific service scope.",\n  "clauses": {\n    "intro": "This Makeup & Hair Service Agreement is between the Artist and Client for makeup and hair services at the listed event location. This Agreement becomes binding when signed by both parties and the non-refundable retainer is received by Artist.",\n    "schedule": "The service windows below are for scheduling and coordination. Contracted services, quantities, and fees are listed in the Pricing section. Artist is not responsible for the actual start time of any ceremony, reception, cocktail hour, photo session, or other event activity.",\n    "pricing": "The rate schedule lists the unit prices. The booking charges table applies those rates to the selected quantities for this Agreement.",\n    "payment": "The retainer is earned upon receipt because Artist reserves the requested dates and times, may decline other work, and begins planning. No dates or times are reserved until this Agreement is signed and the retainer is received. The retainer is non-refundable and non-transferable. The remaining balance must be paid in cleared funds by the deadline above. Artist is not required to begin or continue services until the balance is paid.",\n    "scope": "Bridal makeup is a luxury bridal service with skin preparation/skincare included as part of the application, lashes, and a customized bridal makeup look based on the bride's desired style. Bridal hair is a customized bridal style such as a bun, waves, updo, half-up style, or another agreed bridal style. Hair padding, bobby pins, and safety pins needed for a secure finish are included. Synthetic bun extension may be added when requested or needed. Bridal dupatta/veil setting and jewelry placement include placement support for a polished bridal finish. Bridal hijab setup includes customized hijab styling, extra pinning/securing, and styling products or hold techniques as needed for stronger hold.",\n    "responsibilities": "Client must provide accurate timing, location, access, parking, room, and service recipient information before the event date. Client is responsible for sharing preparation, timing, allergy-disclosure, conduct, and setup requirements with every person receiving services. Client must provide a clean, safe, smoke-free, well-lit service area with a table or workstation, chair, nearby outlet, and enough space for Artist, assigned assistants, tools, and products. Bridal hair clients must arrive with clean, fully dry hair. If extensions are used, Artist recommends Bellami extensions or comparable quality extensions approved in advance. Hijab clients should bring an undercap and non-slippery hijab material; cotton or jersey hijab is recommended for best results.",\n    "limitations": "All people receiving services must be present, ready, and prepared at their scheduled time. Artist may set or revise the order of services to protect the overall timeline. If someone is late, unavailable, unprepared, has wet hair, has makeup already applied, has lash extensions that were supposed to be removed, or otherwise causes delay, Artist may shorten, modify, or skip that service to stay on schedule. No refund, credit, or price reduction will be given for services shortened, modified, skipped, refused, or discontinued due to late arrival, lack of preparation, client delay, guest delay, venue delay, room access issues, safety concerns, or schedule changes outside Artist's control.",\n    "cancellation": "The non-refundable retainer is kept if Client cancels. The parties agree that the cancellation amounts shown in this Agreement are reasonable because Artist reserves the dates, may decline other work, and late replacement bookings may be difficult. A request to reschedule, postpone, change locations, or materially change the timeline is subject to Artist availability and must be agreed in writing. If Artist is unavailable or the parties do not agree to the change, the request is treated as a Client cancellation.",\n    "emergency": "If the Artist cannot perform due to illness, emergency, family emergency, accident, severe weather, venue restrictions, transportation disruption, unsafe conditions, or any circumstances beyond the Artist's reasonable control, the Artist will make reasonable efforts to arrange a qualified substitute. If no substitute is available, the Client will receive a full refund of all amounts paid for any services not performed. If a service is not completed due to the Artist's own delay or inability, and the failure is not caused by the Client, guests, venue, access, preparation, timing, safety, or schedule issues, the Client will receive a refund of the amount paid for that specific unperformed service.",\n    "general": "Artist may take and use photos or videos of completed services for portfolio, website, advertising, or social media only if Client gives written consent. Client may decline without affecting services. This Agreement is governed by New York law. The parties will try to resolve disputes informally first. Any changes must be in writing and confirmed by both parties. Electronic signatures are valid. This Agreement is the full agreement between the parties and replaces prior messages, quotes, or discussions. Services will be performed in accordance with applicable health, sanitation, legal, and venue requirements disclosed to Artist in advance.",\n    "signatures": "By signing below, Client confirms that Client understands the non-refundable retainer, cancellation policy, final payment deadline, guaranteed minimum services, late/unprepared client policy, service limitations, allergy disclosure requirements, and no-payment-no-service rule."\n  }\n}	t	f	2026-05-19 01:29:31.808464	2026-05-19 06:25:55.013	t
4	New Contract Template	Draft contract template.	{\n  "version": 1,\n  "clauses": {\n    "intro": "Contract Template\\n\\nUse this area for clauses, sections, or contract notes that should be available as a reusable template.",\n    "schedule": "Services are priced per person and per service, not hourly. The service windows are for scheduling and coordination. Artist is not responsible for the actual start time of any ceremony, reception, cocktail hour, photo session, or other event activity.",\n    "pricing": "The rate schedule lists the unit prices. The booking charges table applies those rates to the selected quantities for this Agreement.",\n    "payment": "The retainer is earned upon receipt because Artist reserves the requested dates and times, may decline other work, and begins planning. No dates or times are reserved until this Agreement is signed and the retainer is received.",\n    "scope": "Services will be performed according to the selected booking services and the agreed event schedule. Any additional services must be approved by Artist and may require additional fees.",\n    "responsibilities": "Client is responsible for providing accurate timing, location, access, parking, room, and service recipient information before the event date.",\n    "limitations": "Artist may shorten, modify, or skip services if Client, guests, venue access, preparation, timing, safety, or schedule issues cause delay.",\n    "cancellation": "The non-refundable retainer is kept if Client cancels. The parties agree that the cancellation amounts shown in this Agreement are reasonable because Artist reserves the date and may decline other work.",\n    "emergency": "If Artist cannot perform due to illness, emergency, severe weather, unsafe conditions, or circumstances beyond Artist's reasonable control, Artist will make reasonable efforts to arrange a qualified substitute.",\n    "general": "This Agreement is governed by New York law. Any changes must be in writing and confirmed by both parties. Electronic signatures are valid.",\n    "signatures": "By signing below, Client confirms that Client understands the payment terms, cancellation policy, service limits, and responsibilities in this Agreement."\n  }\n}	f	f	2026-05-18 01:06:08.830603	2026-05-19 06:25:55.015	f
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payments (id, booking_id, amount, type, note, paid_at) FROM stdin;
\.


--
-- Data for Name: service_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.service_items (id, name, description, kind, default_unit_price, unit_label, active, sort_order, created_at) FROM stdin;
6	Client-Caused Overtime	Billed in 30-minute increments when client delays extend the schedule.	fee	100.00	hour	t	60	2026-05-17 22:38:12.117902
1	Makeup Only	Non-bridal event makeup / soft glam.	service	150.00	person	t	10	2026-05-17 22:38:12.117902
4	Early Morning Fee	Flat fee for early service start times.	fee	200.00	booking	t	40	2026-05-17 22:38:12.117902
5	Travel Fee	Flat travel fee for the listed service location.	fee	150.00	booking	t	50	2026-05-17 22:38:12.117902
2	Hair Only	Hair service for one person.	service	150.00	person	t	20	2026-05-17 22:38:12.117902
7	Bridal Makeup	\N	service	300.00	person	t	70	2026-05-19 01:29:43.582547
8	Bridal Hair	\N	service	300.00	person	t	70	2026-05-19 01:30:03.336395
9	Add-on: Synthetic Bun Extension	\N	service	15.00	person	t	70	2026-05-19 01:31:46.713195
10	Bridal Setup	\N	service	50.00	person	t	70	2026-05-19 01:32:32.824895
11	Bridal Hijab Setup	\N	service	50.00	person	t	70	2026-05-19 01:32:59.332133
3	Hair & Makeup	Combined hair and makeup service for one person.	service	285.00	person	f	30	2026-05-17 22:38:12.117902
\.


--
-- Name: artist_profiles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.artist_profiles_id_seq', 1, true);


--
-- Name: booking_activity_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.booking_activity_id_seq', 121, true);


--
-- Name: booking_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.booking_events_id_seq', 12, true);


--
-- Name: booking_line_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.booking_line_items_id_seq', 46, true);


--
-- Name: bookings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bookings_id_seq', 9, true);


--
-- Name: clients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.clients_id_seq', 9, true);


--
-- Name: contract_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.contract_templates_id_seq', 5, true);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.payments_id_seq', 1, false);


--
-- Name: service_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.service_items_id_seq', 11, true);


--
-- Name: artist_profiles artist_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artist_profiles
    ADD CONSTRAINT artist_profiles_pkey PRIMARY KEY (id);


--
-- Name: booking_activity booking_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_activity
    ADD CONSTRAINT booking_activity_pkey PRIMARY KEY (id);


--
-- Name: booking_events booking_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_events
    ADD CONSTRAINT booking_events_pkey PRIMARY KEY (id);


--
-- Name: booking_line_items booking_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_line_items
    ADD CONSTRAINT booking_line_items_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: contract_templates contract_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_templates
    ADD CONSTRAINT contract_templates_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: service_items service_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_items
    ADD CONSTRAINT service_items_pkey PRIMARY KEY (id);


--
-- Name: booking_activity booking_activity_booking_id_bookings_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_activity
    ADD CONSTRAINT booking_activity_booking_id_bookings_id_fk FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: booking_events booking_events_booking_id_bookings_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_events
    ADD CONSTRAINT booking_events_booking_id_bookings_id_fk FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: booking_line_items booking_line_items_booking_id_bookings_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_line_items
    ADD CONSTRAINT booking_line_items_booking_id_bookings_id_fk FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: booking_line_items booking_line_items_event_id_booking_events_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_line_items
    ADD CONSTRAINT booking_line_items_event_id_booking_events_id_fk FOREIGN KEY (event_id) REFERENCES public.booking_events(id) ON DELETE SET NULL;


--
-- Name: booking_line_items booking_line_items_service_item_id_service_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_line_items
    ADD CONSTRAINT booking_line_items_service_item_id_service_items_id_fk FOREIGN KEY (service_item_id) REFERENCES public.service_items(id) ON DELETE SET NULL;


--
-- Name: bookings bookings_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_contract_template_id_contract_templates_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_contract_template_id_contract_templates_id_fk FOREIGN KEY (contract_template_id) REFERENCES public.contract_templates(id) ON DELETE SET NULL;


--
-- Name: payments payments_booking_id_bookings_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_booking_id_bookings_id_fk FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict RFvw6BlH8BOnKkODPjcnlehcrvLLPvfWTCka69gnqKYNOeunWwxwBAU4RatRKya

