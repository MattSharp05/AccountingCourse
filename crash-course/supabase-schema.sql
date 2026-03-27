-- ============================================================
-- Crash Course — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ── Profiles (synced from auth.users) ──────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'professor' check (role in ('professor', 'student')),
  display_name text not null default '',
  email text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(split_part(new.email, '@', 1), '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Courses ─────────────────────────────────────────────
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Modules ─────────────────────────────────────────────
create table public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text not null default '',
  "order" integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Maps ────────────────────────────────────────────────
create table public.maps (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'hidden')),
  canvas_data jsonb,
  map_config jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Chapters ────────────────────────────────────────────
create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.maps(id) on delete cascade,
  title text not null,
  "order" integer not null default 0
);

-- ── Content Items ───────────────────────────────────────
create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  type text not null check (type in ('video', 'pdf', 'file', 'text', 'quiz')),
  title text not null,
  description text not null default '',
  file_url text,
  text_content text,
  quiz_data jsonb,
  metadata jsonb,
  "order" integer not null default 0,
  created_at timestamptz not null default now()
);

-- ── Auto-update updated_at trigger ─────────────────────
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger courses_updated_at before update on public.courses
  for each row execute function public.update_updated_at();
create trigger modules_updated_at before update on public.modules
  for each row execute function public.update_updated_at();
create trigger maps_updated_at before update on public.maps
  for each row execute function public.update_updated_at();

-- ── Indexes ─────────────────────────────────────────────
create index idx_courses_professor on public.courses(professor_id);
create index idx_modules_course on public.modules(course_id);
create index idx_maps_module on public.maps(module_id);
create index idx_chapters_map on public.chapters(map_id);
create index idx_content_items_chapter on public.content_items(chapter_id);

-- ── RLS ─────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.maps enable row level security;
alter table public.chapters enable row level security;
alter table public.content_items enable row level security;

-- Profiles
create policy "Users can read own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Courses
create policy "Professors can CRUD own courses"
  on public.courses for all using (auth.uid() = professor_id);

-- Modules
create policy "Professors can CRUD modules of own courses"
  on public.modules for all using (
    exists (
      select 1 from public.courses
      where courses.id = modules.course_id
      and courses.professor_id = auth.uid()
    )
  );

-- Maps
create policy "Professors can CRUD maps of own modules"
  on public.maps for all using (
    exists (
      select 1 from public.modules
      join public.courses on courses.id = modules.course_id
      where modules.id = maps.module_id
      and courses.professor_id = auth.uid()
    )
  );

-- Chapters
create policy "Professors can CRUD chapters of own maps"
  on public.chapters for all using (
    exists (
      select 1 from public.maps
      join public.modules on modules.id = maps.module_id
      join public.courses on courses.id = modules.course_id
      where maps.id = chapters.map_id
      and courses.professor_id = auth.uid()
    )
  );

-- Content items
create policy "Professors can CRUD content items of own chapters"
  on public.content_items for all using (
    exists (
      select 1 from public.chapters
      join public.maps on maps.id = chapters.map_id
      join public.modules on modules.id = maps.module_id
      join public.courses on courses.id = modules.course_id
      where chapters.id = content_items.chapter_id
      and courses.professor_id = auth.uid()
    )
  );

-- ── Storage ─────────────────────────────────────────────
-- NOTE: Create the "course-content" bucket manually in
-- Supabase Dashboard > Storage > New Bucket
-- Set it as PUBLIC with a 50MB file size limit.
--
-- Then run these storage policies:

create policy "Authenticated users can upload"
  on storage.objects for insert
  with check (
    bucket_id = 'course-content'
    and auth.role() = 'authenticated'
  );

create policy "Anyone can read course content"
  on storage.objects for select
  using (bucket_id = 'course-content');

create policy "Users can delete own uploads"
  on storage.objects for delete
  using (
    bucket_id = 'course-content'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── Public READ policies (students / anonymous) ──────────

create policy "Anyone can read published maps"
  on public.maps for select
  using (status = 'published');

create policy "Anyone can read modules with published maps"
  on public.modules for select
  using (
    exists (
      select 1 from public.maps
      where maps.module_id = modules.id
      and maps.status = 'published'
    )
  );

create policy "Anyone can read courses with published maps"
  on public.courses for select
  using (
    exists (
      select 1 from public.modules
      join public.maps on maps.module_id = modules.id
      where modules.course_id = courses.id
      and maps.status = 'published'
    )
  );

create policy "Anyone can read chapters of published maps"
  on public.chapters for select
  using (
    exists (
      select 1 from public.maps
      where maps.id = chapters.map_id
      and maps.status = 'published'
    )
  );

create policy "Anyone can read content items of published maps"
  on public.content_items for select
  using (
    exists (
      select 1 from public.chapters
      join public.maps on maps.id = chapters.map_id
      where chapters.id = content_items.chapter_id
      and maps.status = 'published'
    )
  );
