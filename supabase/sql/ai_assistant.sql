-- Enable pgvector and add embedding column for found posts.
create extension if not exists vector;

alter table public.posts
  add column if not exists description_embedding vector(1024);

-- Vector search RPC used by /api/ai/assistant
create or replace function public.match_found_posts(
  query_embedding vector(1024),
  match_count int default 5
)
returns table (
  id uuid,
  title text,
  description text,
  location text,
  image_urls text[],
  score float
)
language sql
stable
as $$
  select
    p.id,
    p.title,
    p.description,
    p.location,
    p.image_urls,
    1 - (p.description_embedding <=> query_embedding) as score
  from public.posts p
  where p.status = 'found'
    and p.description_embedding is not null
  order by p.description_embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

comment on function public.match_found_posts(vector, int)
  is 'Semantic retrieval for found-item posts via pgvector cosine distance.';
