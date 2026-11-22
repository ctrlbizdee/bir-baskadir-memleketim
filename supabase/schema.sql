-- Bir Başkadır Memleketim - Supabase şeması
-- Supabase panelinde SQL Editor'e yapıştırıp bir kez çalıştırılır.

-- ============ Tablolar ============

create table if not exists bolgeler (
  id   smallint primary key,
  ad   text not null unique
);

create table if not exists iller (
  id        smallint primary key,            -- plaka kodu
  ad        text not null unique,            -- tam ad: "Afyonkarahisar"
  bolge_id  smallint not null references bolgeler(id),
  tanitim   text not null default '',        -- tek cümle: "haşhaşın ve mermerin şehri"
  aktif     boolean not null default false
);

create table if not exists sorular (
  id        bigint primary key,                -- il_id * 1000 + soru no (uygulamadaki ile aynı)
  il_id     smallint not null references iller(id),
  bolge_id  smallint not null references bolgeler(id),
  kategori  text not null,
  zorluk    text not null check (zorluk in ('kolay','orta','zor')),
  soru      text not null,
  dogru     text not null,
  yanlislar text[] not null check (cardinality(yanlislar) = 5),
  aktif     boolean not null default true
);
create index if not exists sorular_il_idx on sorular(il_id) where aktif;

-- Kullanıcı profili: giriş Supabase Auth ile, burada görünen ad ve tercihler
create table if not exists profiller (
  id                uuid primary key references auth.users(id) on delete cascade,
  kullanici_adi     text not null unique check (char_length(kullanici_adi) between 3 and 20),
  ad_degisim_sayisi smallint not null default 0 check (ad_degisim_sayisi <= 2),
  tema              text,                    -- boşsa uygulama ilk açılışta rastgele seçer
  olusturma         timestamptz not null default now()
);
create unique index if not exists profiller_ad_kucuk on profiller (lower(kullanici_adi));

-- Kayıt olunca profil otomatik açılır (kullanıcı adı kayıt sırasında meta veriyle gelir)
create or replace function yeni_kullanici() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiller(id, kullanici_adi) values (new.id, new.raw_user_meta_data->>'kullanici_adi');
  return new;
end $$;
drop trigger if exists yeni_kullanici_tetik on auth.users;
create trigger yeni_kullanici_tetik after insert on auth.users
  for each row execute function yeni_kullanici();

create or replace function kullanici_adi_musait(p_ad text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from profiller where lower(kullanici_adi) = lower(p_ad))
$$;
grant execute on function kullanici_adi_musait(text) to anon, authenticated;

-- Her kullanıcı-soru çifti için tek kayıt. Kayıt yoksa soru "görülmedi".
create table if not exists kullanici_sorular (
  kullanici_id uuid not null references profiller(id) on delete cascade,
  soru_id      bigint not null references sorular(id) on delete cascade,
  il_id        smallint not null references iller(id),
  durum        text not null check (durum in ('dogru','yanlis')),  -- en son cevaba göre
  puan_alindi  boolean not null default false,                     -- bir kez açılınca kapanmaz
  son_cevap    timestamptz not null default now(),
  primary key (kullanici_id, soru_id)
);
create index if not exists ks_il_idx on kullanici_sorular(kullanici_id, il_id);

-- Oynanan her tur
create table if not exists oyunlar (
  id           bigint generated always as identity primary key,
  kullanici_id uuid not null references profiller(id) on delete cascade,
  il_id        smallint not null references iller(id),
  mod          text not null check (mod in ('onluk','yanlisa_kadar')),
  seri         int not null default 0,
  en_uzun_seri int not null default 0,
  dogru_sayisi int not null default 0,
  puan         int not null default 0,
  bitti        boolean not null default false,
  baslangic    timestamptz not null default now()
);

-- Kazanılan her puan (sıralamalar buradan hesaplanır, haftalık/aylık dahil)
create table if not exists puan_hareketleri (
  id           bigint generated always as identity primary key,
  kullanici_id uuid not null references profiller(id) on delete cascade,
  il_id        smallint not null references iller(id),
  oyun_id      bigint references oyunlar(id) on delete set null,
  tur          text not null check (tur in ('soru','seri')),
  puan         int not null,
  zaman        timestamptz not null default now()
);
create index if not exists ph_zaman_idx on puan_hareketleri(zaman);
create index if not exists ph_kullanici_idx on puan_hareketleri(kullanici_id, il_id);

-- ============ Kurallar (src/oyun/kurallar.ts ile aynı) ============

create or replace function soru_puani(p_zorluk text) returns int
language sql immutable as $$
  select case p_zorluk when 'kolay' then 1 when 'orta' then 2 when 'zor' then 3 else 0 end
$$;

-- n. ardışık doğruda verilen seri bonusu
create or replace function seri_bonusu(n int) returns int
language sql immutable as $$
  select case
    when n = 50 then 250
    when n = 35 then 105
    when n > 0 and n % 5 = 0 then n
    else 0 end
$$;

-- ============ İşlemler ============

create or replace function oyun_baslat(p_il_id smallint, p_mod text) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  insert into oyunlar(kullanici_id, il_id, mod) values (auth.uid(), p_il_id, p_mod)
  returning id into v_id;
  return v_id;
end $$;

-- Cevap sunucuda kontrol edilir. p_secilen null = süre doldu.
create or replace function cevap_kaydet(p_oyun_id bigint, p_soru_id bigint, p_secilen text)
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_oyun  oyunlar%rowtype;
  v_soru  sorular%rowtype;
  v_dogru boolean;
  v_onceden_puan boolean;
  v_puan  int := 0;
  v_bonus int := 0;
begin
  select * into v_oyun from oyunlar where id = p_oyun_id and kullanici_id = auth.uid() for update;
  if not found or v_oyun.bitti then raise exception 'oyun bulunamadı'; end if;
  select * into v_soru from sorular where id = p_soru_id and il_id = v_oyun.il_id;
  if not found then raise exception 'soru bulunamadı'; end if;

  v_dogru := p_secilen is not null and p_secilen = v_soru.dogru;

  select puan_alindi into v_onceden_puan from kullanici_sorular
   where kullanici_id = auth.uid() and soru_id = p_soru_id;

  if v_dogru then
    -- Puan yalnızca ilk doğru bilinişte
    if not coalesce(v_onceden_puan, false) then v_puan := soru_puani(v_soru.zorluk); end if;
    v_oyun.seri := v_oyun.seri + 1;
    -- Seri bonusu, puanı daha önce alınmış soruda da geçerli
    v_bonus := seri_bonusu(v_oyun.seri);
  else
    v_oyun.seri := 0;
  end if;

  insert into kullanici_sorular(kullanici_id, soru_id, il_id, durum, puan_alindi)
  values (auth.uid(), p_soru_id, v_oyun.il_id, case when v_dogru then 'dogru' else 'yanlis' end, v_puan > 0)
  on conflict (kullanici_id, soru_id) do update
    set durum = excluded.durum,
        puan_alindi = kullanici_sorular.puan_alindi or excluded.puan_alindi,
        son_cevap = now();

  if v_puan > 0 then
    insert into puan_hareketleri(kullanici_id, il_id, oyun_id, tur, puan)
    values (auth.uid(), v_oyun.il_id, p_oyun_id, 'soru', v_puan);
  end if;
  if v_bonus > 0 then
    insert into puan_hareketleri(kullanici_id, il_id, oyun_id, tur, puan)
    values (auth.uid(), v_oyun.il_id, p_oyun_id, 'seri', v_bonus);
  end if;

  update oyunlar set
    seri = v_oyun.seri,
    en_uzun_seri = greatest(en_uzun_seri, v_oyun.seri),
    dogru_sayisi = dogru_sayisi + case when v_dogru then 1 else 0 end,
    puan = puan + v_puan + v_bonus,
    bitti = bitti or (mod = 'yanlisa_kadar' and not v_dogru)
  where id = p_oyun_id;

  return json_build_object('dogru', v_dogru, 'dogru_cevap', v_soru.dogru,
                           'puan', v_puan, 'bonus', v_bonus, 'seri', v_oyun.seri);
end $$;

create or replace function oyun_bitir(p_oyun_id bigint) returns void
language sql security definer set search_path = public as $$
  update oyunlar set bitti = true where id = p_oyun_id and kullanici_id = auth.uid()
$$;

-- Kullanıcı adı değiştirme (en fazla 2 kez)
create or replace function kullanici_adi_degistir(p_yeni text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update profiller set kullanici_adi = p_yeni, ad_degisim_sayisi = ad_degisim_sayisi + 1
   where id = auth.uid() and ad_degisim_sayisi < 2;
  if not found then raise exception 'kullanıcı adı en fazla 2 kez değiştirilebilir'; end if;
end $$;

-- ============ Sıralamalar ============

-- p_il null = Türkiye geneli. p_donem: 'tum' | 'hafta' | 'ay'.
-- İlk 100 + istekte bulunan kullanıcının kendi satırı döner.
create or replace function siralama(p_il smallint, p_donem text)
returns table(sira bigint, kullanici_adi text, puan int, ben boolean)
language sql stable security definer set search_path = public as $$
  with t as (
    select kullanici_id, sum(puan)::int as puan
      from puan_hareketleri
     where (p_il is null or il_id = p_il)
       and zaman >= case p_donem
                      when 'hafta' then date_trunc('week', now())
                      when 'ay'    then date_trunc('month', now())
                      else '-infinity'::timestamptz end
     group by kullanici_id
  ), r as (
    select rank() over (order by puan desc) as sira, kullanici_id, puan from t
  )
  select r.sira, p.kullanici_adi, r.puan, r.kullanici_id = auth.uid()
    from r join profiller p on p.id = r.kullanici_id
   where r.sira <= 100 or r.kullanici_id = auth.uid()
   order by r.sira, p.kullanici_adi
$$;

-- Giriş yapan kullanıcının il bazında ilerlemesi
create or replace function ilerlemem()
returns table(il_id smallint, bilinen int, puan int, oyun_sayisi int)
language sql stable security definer set search_path = public as $$
  select i.id,
         (select count(*)::int from kullanici_sorular k
           where k.kullanici_id = auth.uid() and k.il_id = i.id and k.durum = 'dogru'),
         (select coalesce(sum(ph.puan), 0)::int from puan_hareketleri ph
           where ph.kullanici_id = auth.uid() and ph.il_id = i.id),
         (select count(*)::int from oyunlar o where o.kullanici_id = auth.uid() and o.il_id = i.id)
    from iller i
$$;

-- ============ Güvenlik (RLS) ============

alter table bolgeler          enable row level security;
alter table iller             enable row level security;
alter table sorular           enable row level security;
alter table profiller         enable row level security;
alter table kullanici_sorular enable row level security;
alter table oyunlar           enable row level security;
alter table puan_hareketleri  enable row level security;

create policy "herkes okur" on bolgeler for select using (true);
create policy "herkes okur" on iller    for select using (true);
create policy "girisli okur" on sorular for select to authenticated using (aktif);
create policy "herkes okur" on profiller for select using (true);
create policy "kendi profilini acar" on profiller for insert to authenticated with check (id = auth.uid());
create policy "kendi temasini degistirir" on profiller for update to authenticated using (id = auth.uid())
  with check (id = auth.uid());
create policy "kendi kaydini okur" on kullanici_sorular for select to authenticated using (kullanici_id = auth.uid());
create policy "kendi oyununu okur" on oyunlar for select to authenticated using (kullanici_id = auth.uid());
-- puan_hareketleri doğrudan okunmaz; sıralama görünümleri üzerinden okunur.
-- Yazmalar yalnızca yukarıdaki fonksiyonlarla yapılır.

-- Tablo izinleri (satır düzeyindeki kısıtlar yukarıdaki RLS kurallarıyla)
grant usage on schema public to anon, authenticated;
grant select on bolgeler, iller, profiller to anon, authenticated;
grant select on sorular, kullanici_sorular, oyunlar to authenticated;
revoke insert, update, delete on bolgeler, iller, sorular, kullanici_sorular, oyunlar, puan_hareketleri
  from anon, authenticated;
revoke all on puan_hareketleri from anon, authenticated;

-- Kullanıcı adı ve ad_degisim_sayisi doğrudan güncellenemesin (yalnızca tema)
revoke insert, update, delete on profiller from anon, authenticated;
grant update (tema) on profiller to authenticated;

-- Fonksiyonlar yalnızca giriş yapmış kullanıcıya açık
revoke execute on function oyun_baslat(smallint, text), cevap_kaydet(bigint, bigint, text),
  oyun_bitir(bigint), kullanici_adi_degistir(text), siralama(smallint, text), ilerlemem()
  from public, anon;
grant execute on function oyun_baslat(smallint, text), cevap_kaydet(bigint, bigint, text),
  oyun_bitir(bigint), kullanici_adi_degistir(text), siralama(smallint, text), ilerlemem()
  to authenticated;
