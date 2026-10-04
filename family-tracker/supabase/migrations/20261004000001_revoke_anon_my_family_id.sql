-- my_family_id() нужна только вошедшим пользователям (её вызывают RLS-политики).
-- Анонимам закрываем, чтобы функция не торчала в публичном API.
revoke execute on function public.my_family_id() from public, anon;
grant execute on function public.my_family_id() to authenticated;
