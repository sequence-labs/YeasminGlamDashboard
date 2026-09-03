alter table public.service_menu_content
  drop constraint if exists service_menu_content_singleton_key;

alter table public.service_menu_content
  add constraint service_menu_content_supported_key
  check (key in ('bridal-services', 'party-services'));
