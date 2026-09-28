alter table public.template_days
	add column session text not null default 'MORNING'
	check (session in ('MORNING', 'EVENING'));

alter table public.template_days
	drop constraint template_days_template_id_day_of_week_key;

alter table public.template_days
	add constraint template_days_template_id_day_of_week_session_key
	unique (template_id, day_of_week, session);
