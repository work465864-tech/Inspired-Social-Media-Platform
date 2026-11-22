insert into public.report_reasons (code, label, sort_order, is_active)
values
  ('spam', 'Spam or misleading content', 10, true),
  ('harassment', 'Harassment or bullying', 20, true),
  ('hate_speech', 'Hate speech', 30, true),
  ('nudity', 'Nudity or sexual content', 40, true),
  ('violence', 'Violence or dangerous acts', 50, true),
  ('self_harm', 'Self-harm content', 60, true),
  ('misinformation', 'False or misleading information', 70, true),
  ('intellectual_property', 'Intellectual property violation', 80, true),
  ('other', 'Other concern', 90, true)
on conflict (code) do update
set
  label = excluded.label,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;
