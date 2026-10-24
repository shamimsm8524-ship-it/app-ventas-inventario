-- Recordatorios mensuales del Panel Principal.
-- No modifica ventas, inventario, caja, catálogo ni datos históricos.

create table if not exists private.varelia_affiliate_billing(
  user_id uuid primary key references auth.users(id) on delete cascade,
  affiliated_at timestamptz not null,
  last_paid_at timestamptz,
  next_due_at timestamptz not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table private.varelia_affiliate_billing enable row level security;

insert into private.varelia_affiliate_billing(user_id,affiliated_at,next_due_at)
select p.id,p.created_at,p.created_at + interval '1 month'
from public.profiles p
where p.role='owner' and not private.varelia_control_is_principal(p.id)
on conflict(user_id) do nothing;

create or replace function public.varelia_control_accounts()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
begin
  if not private.varelia_control_is_principal(auth.uid()) then
    raise exception 'Solo la cuenta principal puede abrir este panel' using errcode='42501';
  end if;
  return jsonb_build_object(
    'context',public.varelia_access_context(),
    'accounts',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',u.id,'email',u.email,
        'name',coalesce(p.full_name,u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'name'),
        'role',coalesce(p.role,'owner'),'business_id',p.business_id,
        'business_name',coalesce(b.name,u.raw_user_meta_data->>'business_name'),'owner_id',b.owner_id,
        'confirmed',u.email_confirmed_at is not null,'created_at',coalesce(p.created_at,u.created_at),
        'last_sign_in_at',u.last_sign_in_at,'status',coalesce(a.status,'active'),
        'principal',u.id=(select principal_id from private.varelia_control_config),
        'approval_code',case when a.status='pending' and r.used_at is null then r.code else null end,
        'approval_expires_at',case when a.status='pending' and r.used_at is null then r.expires_at else null end,
        'approval_reason',case when a.status='pending' and r.used_at is null then r.request_reason else null end,
        'affiliated_at',case when coalesce(p.role,'owner')='owner' and not private.varelia_control_is_principal(u.id) then coalesce(ab.affiliated_at,p.created_at,u.created_at) else null end,
        'last_paid_at',case when coalesce(p.role,'owner')='owner' and not private.varelia_control_is_principal(u.id) then ab.last_paid_at else null end,
        'next_due_at',case when coalesce(p.role,'owner')='owner' and not private.varelia_control_is_principal(u.id) then coalesce(ab.next_due_at,coalesce(p.created_at,u.created_at)+interval '1 month') else null end
      ) order by coalesce(p.created_at,u.created_at) desc)
      from auth.users u
      left join public.profiles p on p.id=u.id
      left join public.businesses b on b.id=p.business_id
      left join private.varelia_account_access a on a.user_id=u.id
      left join private.varelia_approval_requests r on r.user_id=u.id
      left join private.varelia_affiliate_billing ab on ab.user_id=u.id
    ),'[]'::jsonb),
    'activity',coalesce((select jsonb_agg(to_jsonb(log)) from (
      select l.actor_id,l.target_id,l.action,l.created_at
      from private.varelia_control_audit l order by l.id desc limit 100
    ) log),'[]'::jsonb)
  );
end $$;
revoke all on function public.varelia_control_accounts() from public,anon;
grant execute on function public.varelia_control_accounts() to authenticated;

create or replace function public.varelia_control_mark_paid(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_affiliated timestamptz; v_due timestamptz;
begin
  if not private.varelia_control_is_principal(auth.uid()) then
    raise exception 'Solo la cuenta principal puede registrar pagos' using errcode='42501';
  end if;
  if private.varelia_control_is_principal(p_user_id) then
    raise exception 'La cuenta principal no genera cobros de afiliación';
  end if;
  select p.created_at into v_affiliated from public.profiles p where p.id=p_user_id and p.role='owner';
  if not found then raise exception 'Administrador afiliado no encontrado'; end if;
  select next_due_at into v_due from private.varelia_affiliate_billing where user_id=p_user_id for update;
  if not found then v_due:=v_affiliated + interval '1 month'; end if;
  while v_due <= now() loop v_due:=v_due + interval '1 month'; end loop;
  insert into private.varelia_affiliate_billing(user_id,affiliated_at,last_paid_at,next_due_at,updated_by)
  values(p_user_id,v_affiliated,now(),v_due,auth.uid())
  on conflict(user_id) do update set last_paid_at=excluded.last_paid_at,next_due_at=excluded.next_due_at,updated_at=now(),updated_by=auth.uid();
  insert into private.varelia_control_audit(actor_id,target_id,action) values(auth.uid(),p_user_id,'payment_recorded');
  return jsonb_build_object('ok',true,'last_paid_at',now(),'next_due_at',v_due);
end $$;
revoke all on function public.varelia_control_mark_paid(uuid) from public,anon;
grant execute on function public.varelia_control_mark_paid(uuid) to authenticated;
