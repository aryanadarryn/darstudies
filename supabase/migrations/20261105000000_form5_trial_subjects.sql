-- Form 5 follows Form 4: paid, and included in the free trial.
update public.app_settings
set trial_subjects = trial_subjects || array(
  select x from unnest(array['f5phy','f5chem','f5bio','f5addmath','f5math','f5sej','f5pi','f5bm','f5bi']) as x
  where not x = any (trial_subjects)
)
where id = 1;
